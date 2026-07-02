import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { hydrateFromDurable } from './lib/durable-storage';

// Restore the durable native mirror into localStorage (iOS can purge WKWebView
// localStorage) BEFORE React renders, so the hooks read the recovered data at
// init. Resolves immediately on web.
async function boot() {
  await hydrateFromDurable();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
