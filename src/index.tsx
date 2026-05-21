import './fix-fetch';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

// Handle OAuth callback popup
if (window.location.search.includes('code=')) {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'PINTEREST_AUTH_CODE', code },
        window.location.origin
      );
      // Fallback for COOP restricted popups
      localStorage.setItem('pinterest_auth_code', code);
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><p>Connecting to Pinterest... You can close this window now.</p></div>';
      setTimeout(() => window.close(), 100);
    } else {
      // It's the main window! Not a popup. 
      // Set local storage so App can pick it up.
      localStorage.setItem('pinterest_auth_code_main_window', code);
      // Remove code from URL to avoid re-triggering
      window.history.replaceState({}, document.title, window.location.pathname);
      // Render App
      const rootElement = document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      }
    }
  }
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
