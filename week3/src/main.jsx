import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './Store';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><StoreProvider><App /></StoreProvider></React.StrictMode>);
