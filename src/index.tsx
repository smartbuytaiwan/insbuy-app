import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // ★ 載入 Tailwind 與全域樣式

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}