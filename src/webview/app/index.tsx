import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css'; // Import the CSS file

// Get the root element where the React app will be mounted.
const container = document.getElementById('root');

// Ensure the container exists before attempting to create a root.
if (container) {
    // Create a React root and render the App component.
    // Using createRoot for React 18+ concurrent mode features.
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Root element #root not found in the document.');
}
