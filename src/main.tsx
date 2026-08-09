// Prevent localStorage and sessionStorage block/exception crashes inside restricted iframe sandbox contexts
const mockStorage: Record<string, string> = {};
const storageMock = {
  getItem: (key: string) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key: string, value: string) => { mockStorage[key] = String(value); },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  get length() { return Object.keys(mockStorage).length; }
};

try {
  const uid = '__storage_test__';
  window.localStorage.setItem(uid, uid);
  window.localStorage.removeItem(uid);
} catch (exception) {
  console.warn("localStorage is blocked or restricted. Patched with safe in-memory fallback.", exception);
  
  // 1. Try to redefine on Window.prototype (standard way to override non-configurable properties on instance)
  try {
    Object.defineProperty(Window.prototype, 'localStorage', {
      get: () => storageMock,
      configurable: true
    });
  } catch (e1) {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: storageMock,
        writable: true,
        configurable: true
      });
    } catch (e2) {
      console.warn("Could not patch localStorage with in-memory fallback", e1, e2);
    }
  }

  // Do the same for sessionStorage
  try {
    Object.defineProperty(Window.prototype, 'sessionStorage', {
      get: () => storageMock,
      configurable: true
    });
  } catch (e1) {
    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: storageMock,
        writable: true,
        configurable: true
      });
    } catch (e2) {
      console.warn("Could not patch sessionStorage with in-memory fallback", e2);
    }
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
