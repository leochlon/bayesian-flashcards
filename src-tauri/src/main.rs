#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

struct AppState {
    backend_process: Arc<Mutex<Option<std::process::Child>>>,
}

#[tauri::command]
async fn start_backend(app_handle: tauri::AppHandle) -> Result<String, String> {
    println!("Starting backend server...");
    
    // Get the resource directory path
    let resource_dir = app_handle.path().resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;
    
    let python_executable = if cfg!(debug_assertions) {
        // Development mode - use system python
        "python3".to_string()
    } else {
        // Production mode - use bundled python
        let python_path = resource_dir.join("python-portable").join("bin").join("python");
        python_path.to_string_lossy().to_string()
    };
    
    let backend_dir = if cfg!(debug_assertions) {
        // Development mode - use relative path
        "../backend".to_string()
    } else {
        // Production mode - use bundled backend
        let backend_path = resource_dir.join("python-dist").join("backend");
        backend_path.to_string_lossy().to_string()
    };
    
    println!("Using python executable: {}", python_executable);
    println!("Using backend directory: {}", backend_dir);
    
    // Try to start the Python backend
    let mut cmd = Command::new(&python_executable);
    cmd.arg("-m")
       .arg("flask")
       .arg("--app")
       .arg("app.py")
       .arg("run")
       .arg("--host")
       .arg("127.0.0.1")
       .arg("--port")
       .arg("5002")
       .current_dir(&backend_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    match cmd.spawn() {
        Ok(child) => {
            println!("Backend process started with PID: {}", child.id());
            
            // Give the server time to start
            thread::sleep(Duration::from_secs(3));
            
            Ok("Backend started successfully".to_string())
        },
        Err(e) => {
            println!("Failed to start backend with {}: {}", python_executable, e);
            
            // Try with alternative python command
            let alt_python = if cfg!(debug_assertions) {
                "python"
            } else {
                "python3"
            };
            
            let mut cmd2 = Command::new(alt_python);
            cmd2.arg("-m")
                .arg("flask")
                .arg("--app")
                .arg("app.py")
                .arg("run")
                .arg("--host")
                .arg("127.0.0.1")
                .arg("--port")
                .arg("5002")
                .current_dir(&backend_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
                
            match cmd2.spawn() {
                Ok(child) => {
                    println!("Backend process started with PID: {}", child.id());
                    thread::sleep(Duration::from_secs(3));
                    Ok("Backend started successfully".to_string())
                },
                Err(e2) => {
                    Err(format!("Failed to start backend with both {} and {}: {} / {}", python_executable, alt_python, e, e2))
                }
            }
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
            let app_handle = app.handle().clone();
            let _state = app.state::<AppState>();
            
            tauri::async_runtime::spawn(async move {
                println!("Setting up backend during app initialization...");
                match start_backend(app_handle).await {
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
