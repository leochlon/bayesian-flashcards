#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

struct AppState {
    backend_process: Arc<Mutex<Option<std::process::Child>>>,
}

#[tauri::command]
async fn start_backend() -> Result<String, String> {
    println!("Starting Python backend...");
    
    // Get the resource directory
    let resource_dir = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?
        .parent()
        .ok_or("Failed to get parent directory")?
        .join("../Resources");
    
    println!("Resource directory: {:?}", resource_dir);
    
    // Check if we're in development or production
    let (python_script, python_exe, working_dir) = if resource_dir.exists() {
        // Production - use bundled Python backend
        let script = resource_dir.join("python-dist/backend/app.py");
        let backend_dir = resource_dir.join("python-dist/backend");
        
        // Try multiple Python executable paths for macOS
        let python_candidates = vec![
            "/usr/bin/python3",
            "/usr/local/bin/python3", 
            "/opt/homebrew/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3",
            "python3",
            "python",
        ];
        
        let mut found_python = None;
        for candidate in python_candidates {
            // First check if the executable exists (for absolute paths)
            let exe_exists = if candidate.starts_with('/') {
                std::path::Path::new(candidate).exists()
            } else {
                true // For relative paths like "python3", we'll test by running
            };
            
            if exe_exists {
                // Test if this Python can import required modules
                println!("Testing Python candidate: {}", candidate);
                let test_cmd = std::process::Command::new(candidate)
                    .args(["-c", "import sys; print('Python version:', sys.version); import flask, sqlalchemy; print('Required modules available')"])
                    .output();
                
                if let Ok(output) = test_cmd {
                    if output.status.success() {
                        println!("Found working Python: {}", candidate);
                        println!("Python test output: {}", String::from_utf8_lossy(&output.stdout));
                        found_python = Some(candidate.to_string());
                        break;
                    } else {
                        println!("Python test failed for {}: {}", candidate, String::from_utf8_lossy(&output.stderr));
                    }
                } else {
                    println!("Could not execute Python candidate: {}", candidate);
                }
            }
        }
        
        let python = found_python.ok_or_else(|| {
            "No suitable Python installation found. Please install Python 3.10+ with Flask and SQLAlchemy packages.\n\nYou can install the requirements using:\npip3 install flask sqlalchemy flask-sqlalchemy flask-migrate flask-cors requests numpy matplotlib".to_string()
        })?;
        
        (script, python, backend_dir)
    } else {
        // Development - use backend in the current directory
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?;
        let script = current_dir.join("backend/app.py");
        let backend_dir = current_dir.join("backend");
        (script, "python3".to_string(), backend_dir)
    };

    println!("Python script path: {:?}", python_script);
    println!("Python executable: {}", python_exe);
    println!("Working directory: {:?}", working_dir);
    
    if !python_script.exists() {
        return Err(format!("Python script not found at: {:?}", python_script));
    }
    
    if !working_dir.exists() {
        return Err(format!("Backend directory not found at: {:?}", working_dir));
    }
    
    // Start the Python process
    let mut cmd = std::process::Command::new(&python_exe);
    cmd.arg(python_script.to_str().unwrap());
    
    // Set working directory to the backend directory
    cmd.current_dir(&working_dir);
    
    // Set environment variables to help with Python path issues
    cmd.env("PYTHONPATH", &working_dir);
    cmd.env("PYTHONUNBUFFERED", "1");
    cmd.env("FLASK_ENV", "production");
    
    // Redirect output to help with debugging
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    
    println!("Executing command: {:?}", cmd);
    println!("Working directory: {:?}", working_dir);
    
    match cmd.spawn() {
        Ok(mut child) => {
            println!("Python backend started with PID: {}", child.id());
            
            // Give the backend time to start up
            tokio::time::sleep(tokio::time::Duration::from_secs(8)).await;
            
            // Check if the process is still running
            match child.try_wait() {
                Ok(Some(status)) => {
                    // Process has exited
                    return Err(format!("Backend process exited immediately with status: {}", status));
                }
                Ok(None) => {
                    // Process is still running, good!
                    println!("Backend process is running");
                }
                Err(e) => {
                    return Err(format!("Error checking backend process status: {}", e));
                }
            }
            
            // Test the connection
            let test_result = test_backend_connection().await;
            match test_result {
                Ok(_) => {
                    println!("Backend connection test successful");
                    // Note: We're not storing the child process here because this function
                    // is called independently. The process management should be handled 
                    // by the calling setup function.
                    Ok(format!("Backend started successfully with PID: {}", child.id()))
                }
                Err(e) => {
                    println!("Backend connection test failed: {}", e);
                    // Try to get error output from the process
                    if let Ok(output) = child.wait_with_output() {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        return Err(format!("Backend process started but connection failed: {}\n\nProcess output:\nSTDOUT: {}\nSTDERR: {}", e, stdout, stderr));
                    }
                    Err(format!("Backend process started but connection failed: {}", e))
                }
            }
        }
        Err(e) => {
            let error_msg = format!(
                "Failed to start Python backend: {}.\n\nTroubleshooting:\n1. Ensure Python 3.10+ is installed\n2. Install required packages: pip3 install flask sqlalchemy flask-sqlalchemy flask-migrate flask-cors requests numpy matplotlib\n3. Check that the backend files exist at: {:?}",
                e, working_dir
            );
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

// Function for managing backend with state
async fn start_and_manage_backend(state: &AppState) -> Result<String, String> {
    // Check if backend is already running
    {
        let process_guard = state.backend_process.lock().unwrap();
        if process_guard.is_some() {
            // Test if still accessible
            if test_backend_connection().await.is_ok() {
                return Ok("Backend already running".to_string());
            }
            // If not accessible, we'll restart it
        }
    }
    
    // Get the resource directory
    let resource_dir = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?
        .parent()
        .ok_or("Failed to get parent directory")?
        .join("../Resources");
    
    println!("Resource directory: {:?}", resource_dir);
    
    // Check if we're in development or production
    let (python_script, python_exe, working_dir) = if resource_dir.exists() {
        // Production - use bundled Python backend
        let script = resource_dir.join("python-dist/backend/app.py");
        let backend_dir = resource_dir.join("python-dist/backend");
        
        // Try multiple Python executable paths for macOS
        let python_candidates = vec![
            "/usr/bin/python3",
            "/usr/local/bin/python3", 
            "/opt/homebrew/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3",
            "python3",
            "python",
        ];
        
        let mut found_python = None;
        for candidate in python_candidates {
            // First check if the executable exists (for absolute paths)
            let exe_exists = if candidate.starts_with('/') {
                std::path::Path::new(candidate).exists()
            } else {
                true // For relative paths like "python3", we'll test by running
            };
            
            if exe_exists {
                // Test if this Python can import required modules
                println!("Testing Python candidate: {}", candidate);
                let test_cmd = std::process::Command::new(candidate)
                    .args(["-c", "import sys; print('Python version:', sys.version); import flask, sqlalchemy; print('Required modules available')"])
                    .output();
                
                if let Ok(output) = test_cmd {
                    if output.status.success() {
                        println!("Found working Python: {}", candidate);
                        println!("Python test output: {}", String::from_utf8_lossy(&output.stdout));
                        found_python = Some(candidate.to_string());
                        break;
                    } else {
                        println!("Python test failed for {}: {}", candidate, String::from_utf8_lossy(&output.stderr));
                    }
                } else {
                    println!("Could not execute Python candidate: {}", candidate);
                }
            }
        }
        
        let python = found_python.ok_or_else(|| {
            "No suitable Python installation found. Please install Python 3.10+ with Flask and SQLAlchemy packages.\n\nYou can install the requirements using:\npip3 install flask sqlalchemy flask-sqlalchemy flask-migrate flask-cors requests numpy matplotlib".to_string()
        })?;
        
        (script, python, backend_dir)
    } else {
        // Development - use backend in the current directory
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?;
        let script = current_dir.join("backend/app.py");
        let backend_dir = current_dir.join("backend");
        (script, "python3".to_string(), backend_dir)
    };

    println!("Python script path: {:?}", python_script);
    println!("Python executable: {}", python_exe);
    println!("Working directory: {:?}", working_dir);
    
    if !python_script.exists() {
        return Err(format!("Python script not found at: {:?}", python_script));
    }
    
    if !working_dir.exists() {
        return Err(format!("Backend directory not found at: {:?}", working_dir));
    }
    
    // Start the Python process
    let mut cmd = std::process::Command::new(&python_exe);
    cmd.arg(python_script.to_str().unwrap());
    
    // Set working directory to the backend directory
    cmd.current_dir(&working_dir);
    
    // Set environment variables to help with Python path issues
    cmd.env("PYTHONPATH", &working_dir);
    cmd.env("PYTHONUNBUFFERED", "1");
    cmd.env("FLASK_ENV", "production");
    
    // Redirect output to help with debugging
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    
    println!("Executing command: {:?}", cmd);
    
    match cmd.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            println!("Python backend started with PID: {}", pid);
            
            // Store the process in the state
            {
                let mut process_guard = state.backend_process.lock().unwrap();
                *process_guard = Some(child);
            }
            
            // Give the backend time to start up
            tokio::time::sleep(tokio::time::Duration::from_secs(8)).await;
            
            // Test the connection
            let test_result = test_backend_connection().await;
            match test_result {
                Ok(_) => {
                    println!("Backend connection test successful");
                    Ok(format!("Backend started successfully with PID: {}", pid))
                }
                Err(e) => {
                    println!("Backend connection test failed: {}", e);
                    Err(format!("Backend process started but connection failed: {}", e))
                }
            }
        }
        Err(e) => {
            let error_msg = format!(
                "Failed to start Python backend: {}.\n\nTroubleshooting:\n1. Ensure Python 3.10+ is installed\n2. Install required packages: pip3 install flask sqlalchemy flask-sqlalchemy flask-migrate flask-cors requests numpy matplotlib\n3. Check that the backend files exist at: {:?}",
                e, working_dir
            );
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}

async fn test_backend_connection() -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://localhost:5002/api/health")
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Backend returned status: {}", response.status()))
    }
}

#[tauri::command]
async fn stop_backend(state: State<'_, AppState>) -> Result<String, String> {
    let mut process_guard = state.backend_process.lock().unwrap();
    if let Some(mut process) = process_guard.take() {
        let _ = process.kill();
        let _ = process.wait();
        Ok("Backend stopped".to_string())
    } else {
        Ok("Backend was not running".to_string())
    }
}

#[tauri::command]
async fn show_prompt_dialog(window: tauri::Window, title: String, default_value: String) -> Result<Option<String>, String> {
    let message = format!("{}\n\nWe'll use the default name: {}\n\nWould you like to continue?", title, default_value);
    
    let response = window.dialog()
        .message(message)
        .title("Study Session")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show();
    
    match response {
        true => Ok(Some(default_value)),
        false => Ok(None)
    }
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

fn main() {
    let app_state = AppState {
        backend_process: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            show_prompt_dialog,
            get_app_version
        ])
        .setup(|app| {
            let _app_handle = app.handle();
            let _state = app.state::<AppState>();
            
            tauri::async_runtime::spawn(async move {
                println!("Setting up backend during app initialization...");
                match start_backend().await {
                    Ok(msg) => {
                        println!("Backend setup successful: {}", msg);
                    }
                    Err(e) => {
                        eprintln!("Failed to start backend during setup: {}", e);
                        // Don't panic here - let the app start and show error in UI
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<AppState>();
                let process_guard = state.backend_process.clone();
                tauri::async_runtime::spawn(async move {
                    let mut process = process_guard.lock().unwrap();
                    if let Some(mut proc) = process.take() {
                        println!("Terminating backend process on app close...");
                        let _ = proc.kill();
                        let _ = proc.wait();
                        println!("Backend process terminated");
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
