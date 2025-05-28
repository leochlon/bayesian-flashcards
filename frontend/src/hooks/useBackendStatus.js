import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../api';

export const useBackendStatus = () => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Check backend status
  const checkBackendStatus = useCallback(async () => {
    try {
      console.log(`Checking backend status at ${API}/health`);
      const response = await axios.get(`${API}/health`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('Backend is ready');
        setIsBackendReady(true);
        setBackendError(null);
      } else {
        console.error('Backend returned unexpected status:', response.status);
        setIsBackendReady(false);
        setBackendError(`Backend returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setIsBackendReady(false);
      setBackendError(error.message);
    }
  }, []);

  // Check backend status on load
  useEffect(() => {
    checkBackendStatus();
    
    // Set up an interval to periodically check backend status
    const intervalId = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [checkBackendStatus]);

  return {
    isBackendReady,
    backendError,
    checkBackendStatus
  };
};