#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State, Window};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tokio::time::sleep;

#[derive(Debug, Serialize, Deserialize)]
struct SessionInfo {
    active: bool,
    session_id: Option<String>,
}

struct AppState {
    backend_process: Arc<Mutex<Option<std::process::Child>>>,
    active_session: Arc<Mutex<SessionInfo>>,
}

#[tauri::command]
async fn start_backend(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    println!("Starting Python backend...");
    
    let resource_dir = app_handle.path().resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;
    
    let python_dist = resource_dir.join("python-dist");
    let backend_dir = python_dist.join("backend");
    
    // Check if we have a bundled Python
    let python_executable = if python_dist.join("python-venv").join("bin").join("python").exists() {
        python_dist.join("python-venv").join("bin").join("python")
    } else {
        // Fall back to system Python
        std::path::PathBuf::from("python3")
    };
    
    let app_py_path = backend_dir.join("app.py");
    let init_db_path = backend_dir.join("init_db.py");
    
    if !app_py_path.exists() {
        return Err(format!("Backend script not found at: {:?}", app_py_path));
    }
    
    // Set database path to app data directory
    let app_data_dir = if cfg!(target_os = "macos") {
        // On macOS, use Application Support directory
        let home = std::env::var("HOME").map_err(|e| format!("Failed to get HOME directory: {}", e))?;
        let app_support = std::path::PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("Bayesian Flashcards");
        std::fs::create_dir_all(&app_support).map_err(|e| format!("Failed to create app dir: {}", e))?;
        app_support
    } else {
        // On other platforms, use the default app_local_data_dir
        app_handle.path().app_local_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?
    };

    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_data_dir.join("flashcards.db");
    let database_url = format!("sqlite:///{}", db_path.display());
    
    // Initialize database if it doesn't exist or if init_db.py exists
    if !db_path.exists() || init_db_path.exists() {
        println!("Initializing database at: {}", db_path.display());
        println!("Using Python executable: {}", python_executable.display());
        println!("Using init script: {}", init_db_path.display());
        
        let mut init_cmd = Command::new(&python_executable);
        init_cmd.arg(&init_db_path)
               .current_dir(&backend_dir)
               .env("PYTHONPATH", &backend_dir)
               .env("DATABASE_URL", &database_url)
               .stdout(Stdio::piped())
               .stderr(Stdio::piped());
        
        match init_cmd.output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                
                if output.status.success() {
                    println!("Database initialized successfully");
                    println!("Init stdout: {}", stdout);
                } else {
                    println!("Database initialization failed with exit code: {}", output.status);
                    println!("Init stdout: {}", stdout);
                    println!("Init stderr: {}", stderr);
                }
            },
            Err(e) => {
                println!("Failed to run database initialization: {}", e);
            }
        }
    } else {
        println!("Database already exists at: {}", db_path.display());
    }
    
    // Set up environment for main app
    println!("Starting main backend with Python: {}", python_executable.display());
    println!("Backend directory: {}", backend_dir.display());
    println!("Database URL: {}", database_url);
    
    let mut cmd = Command::new(&python_executable);
    cmd.arg(&app_py_path)
       .current_dir(&backend_dir)
       .env("PYTHONPATH", &backend_dir)
       .env("DATABASE_URL", &database_url)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    let child = cmd.spawn().map_err(|e| format!("Failed to start backend: {}", e))?;
    
    // Store the process handle
    *state.backend_process.lock().unwrap() = Some(child);
    
    // Wait a moment for the backend to start
    sleep(Duration::from_secs(3)).await;
    
    // Test backend connection
    match test_backend_connection().await {
        Ok(_) => Ok("Backend started successfully".to_string()),
        Err(e) => Err(format!("Backend started but connection test failed: {}", e))
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
async fn check_active_session(state: State<'_, AppState>) -> Result<bool, String> {
    let session_info = state.active_session.lock().unwrap();
    Ok(session_info.active)
}

#[tauri::command]
async fn start_session(session_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut session_info = state.active_session.lock().unwrap();
    session_info.active = true;
    session_info.session_id = Some(session_id);
    Ok(())
}

#[tauri::command]
async fn end_session(state: State<'_, AppState>) -> Result<(), String> {
    let mut session_info = state.active_session.lock().unwrap();
    session_info.active = false;
    session_info.session_id = None;
    Ok(())
}

#[tauri::command]
async fn confirm_navigation(_window: Window) -> Result<bool, String> {
    // In Tauri v2, dialog functionality is different
    // For now, just return true - you can implement proper dialogs later
    Ok(true)
}

#[tauri::command]
async fn show_prompt_dialog(window: Window, title: String, default_value: String) -> Result<Option<String>, String> {
    // Since Tauri v2 doesn't have a built-in text input dialog,
    // we'll show a confirmation dialog and use the default value
    // In a production app, you might want to create a custom dialog window
    
    println!("Prompt dialog requested: {}", title);
    println!("Default value: {}", default_value);
    
    let message = format!("{}\n\nWe'll use the default name: {}\n\nWould you like to continue?", title, default_value);
    
    let response = window.dialog()
        .message(message)
        .title("Study Session")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show();
    
    println!("Dialog response: {:?}", response);
    
    match response {
        true => {
            println!("User accepted, returning default value: {}", default_value);
            Ok(Some(default_value))
        },
        false => {
            println!("User cancelled");
            Ok(None)
        }
    }
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

fn main() {
    let app_state = AppState {
        backend_process: Arc::new(Mutex::new(None)),
        active_session: Arc::new(Mutex::new(SessionInfo {
            active: false,
            session_id: None,
        })),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            check_active_session,
            start_session,
            end_session,
            confirm_navigation,
            show_prompt_dialog,
            get_app_version
        ])
        .setup(|app| {
            let app_handle = app.handle();
            
            // Start backend automatically
            let handle_for_async = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let state = handle_for_async.state::<AppState>();
                let handle_for_start = handle_for_async.clone();
                if let Err(e) = start_backend(handle_for_start, state).await {
                    eprintln!("Failed to start backend: {}", e);
                }
            });
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                
                // Stop backend when window closes
                let process_guard = state.backend_process.clone();
                tauri::async_runtime::spawn(async move {
                    let mut process = process_guard.lock().unwrap();
                    if let Some(mut proc) = process.take() {
                        let _ = proc.kill();
                        let _ = proc.wait();
                    }
                });
                
                // Prevent the window from closing immediately
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
