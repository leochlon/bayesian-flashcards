import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API } from '../api';

export const useBackendStatus = () => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryCount = useRef(0);
  const maxRetries = 10;
  const initialRetryDelay = 1000; // 1 second
  const loadingStartTime = useRef(Date.now());
  const minLoadingTime = 3000; // Show loading for at least 3 seconds

  // Calculate exponential backoff delay
  const getRetryDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. up to a max of 15 seconds
    return Math.min(initialRetryDelay * Math.pow(2, retryCount.current), 15000);
  };

  // Check backend status
  const checkBackendStatus = useCallback(async (immediate = false) => {
    if (!immediate && retryCount.current > maxRetries) {
      setBackendError("Maximum retry attempts reached. Please restart the application.");
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Checking backend status at ${API}/health (Attempt ${retryCount.current + 1})`);
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
        
        // Ensure we show loading screen for at least minLoadingTime
        const elapsed = Date.now() - loadingStartTime.current;
        if (elapsed < minLoadingTime) {
          setTimeout(() => {
            setIsLoading(false);
          }, minLoadingTime - elapsed);
        } else {
          setIsLoading(false);
        }
      } else {
        console.error('Backend returned unexpected status:', response.status);
        setIsBackendReady(false);
        
        // Only show error after minLoadingTime has passed
        const elapsed = Date.now() - loadingStartTime.current;
        if (elapsed >= minLoadingTime) {
          setBackendError(`Backend returned status ${response.status}`);
          setIsLoading(false);
        } else {
          // Schedule another retry
          retryCount.current += 1;
          setTimeout(checkBackendStatus, getRetryDelay());
        }
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      
      // Only show error after minLoadingTime has passed
      const elapsed = Date.now() - loadingStartTime.current;
      if (elapsed >= minLoadingTime) {
        setIsBackendReady(false);
        setBackendError(error.message);
        setIsLoading(false);
      } else {
        // Schedule another retry
        retryCount.current += 1;
        setTimeout(() => checkBackendStatus(), getRetryDelay());
      }
    }
  }, []);

  // Check backend status on load
  useEffect(() => {
    loadingStartTime.current = Date.now();
    checkBackendStatus();
    
    // Set up an interval to periodically check backend status after successful connection
    const intervalId = setInterval(() => {
      if (isBackendReady) {
        checkBackendStatus(true); // Pass true to bypass retry limit
      }
    }, 30000); // Check every 30 seconds after successful connection
    
    return () => {
      clearInterval(intervalId);
    };
  }, [checkBackendStatus, isBackendReady]);

  return {
    isBackendReady,
    backendError,
    isLoading,
    checkBackendStatus
  };
};