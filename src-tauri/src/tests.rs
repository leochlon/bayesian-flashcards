#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_app_state_initialization() {
        let app_state = AppState {
            backend_process: Arc::new(Mutex::new(None)),
            active_session: Arc::new(Mutex::new(SessionInfo {
                active: false,
                session_id: None,
            })),
        };
        
        let session_info = app_state.active_session.lock().unwrap();
        assert_eq!(session_info.active, false);
        assert_eq!(session_info.session_id, None);
    }
    
    #[tokio::test]
    async fn test_check_active_session() {
        let app_state = AppState {
            backend_process: Arc::new(Mutex::new(None)),
            active_session: Arc::new(Mutex::new(SessionInfo {
                active: false,
                session_id: None,
            })),
        };
        
        let result = check_active_session(tauri::State::new(&app_state)).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
