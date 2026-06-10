import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {bootstrapTenantBranding} from './lib/branding';
import './index.css';

const root = document.getElementById('root')!;

bootstrapTenantBranding().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
