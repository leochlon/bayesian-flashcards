#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State, Window};
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
    
    let resource_dir = app_handle.path_resolver()
        .resource_dir()
        .ok_or("Failed to get resource directory")?;
    
    let backend_dir = resource_dir.join("backend");
    let python_dist = resource_dir.join("python-dist");
    
    // Check if we have a bundled Python
    let python_executable = if python_dist.exists() {
        python_dist.join("python").join("python")
    } else {
        // Fall back to system Python
        std::path::PathBuf::from("python3")
    };
    
    let app_py_path = backend_dir.join("app.py");
    
    if !app_py_path.exists() {
        return Err(format!("Backend script not found at: {:?}", app_py_path));
    }
    
    // Set up environment
    let mut cmd = Command::new(&python_executable);
    cmd.arg(&app_py_path)
       .current_dir(&backend_dir)
       .env("PYTHONPATH", &backend_dir)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    // Set database path to app data directory
    let app_data_dir = app_handle.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data directory")?;
    
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    let db_path = app_data_dir.join("flashcards.db");
    cmd.env("DATABASE_URL", format!("sqlite:///{}", db_path.display()));
    
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
async fn confirm_navigation(window: Window) -> Result<bool, String> {
    let result = tauri::api::dialog::blocking::confirm(
        Some(&window),
        "Active Study Session",
        "You have an active study session. Do you want to end it and navigate away? Your progress will be saved."
    );
    Ok(result)
}

#[tauri::command]
async fn show_prompt_dialog(window: Window, title: String, default_value: String) -> Result<Option<String>, String> {
    // For now, use a simple confirm dialog - you can enhance this with a custom dialog
    let message = format!("{}\n\nDefault: {}", title, default_value);
    let result = tauri::api::dialog::blocking::confirm(
        Some(&window),
        "Input Required",
        &message
    );
    
    if result {
        Ok(Some(default_value))
    } else {
        Ok(None)
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
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                let window = event.window();
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
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
