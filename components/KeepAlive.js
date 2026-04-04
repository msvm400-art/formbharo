'use client';

import { useEffect } from 'react';

/**
 * KeepAlive component pings the backend every 5 minutes to prevent it from sleeping 
 * on free-tier hosting services like Render or Railway.
 */
export default function KeepAlive() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';

  useEffect(() => {
    const pingBackend = async () => {
      try {
        console.log('[Keep-Alive] Pinging backend to keep it active...');
        const response = await fetch(BACKEND_URL);
        if (response.ok) {
          console.log('[Keep-Alive] Backend is awake.');
        } else {
          console.warn('[Keep-Alive] Ping failed, but backend might just be slow.');
        }
      } catch (error) {
        console.error('[Keep-Alive] Failed to reach backend:', error.message);
      }
    };

    // Initial ping on load
    pingBackend();

    // Ping every 5 minutes (300,000 ms)
    const intervalId = setInterval(pingBackend, 300000);

    return () => clearInterval(intervalId);
  }, [BACKEND_URL]);

  return null; // This component doesn't render any UI
}
