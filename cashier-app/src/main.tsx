import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/errors';
import { RootProvider } from './store/RootProvider';
import './styles/theme.css';
import './styles/tokens.css';
import './styles/globals.css';

/* -------------------------------------------------------------------------- */
/* Global safety nets                                                         */
/* -------------------------------------------------------------------------- */
/* Anything that escapes React's component tree (event handlers, timers,      */
/* rejected promises inside .then callbacks, IDB errors during Dexie writes)  */
/* lands here. We log loudly and — if the app is mounted — surface a toast so */
/* the user knows to try again instead of silently losing their work.        */
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('[window.onerror]', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledrejection]', event.reason);
});

/* -------------------------------------------------------------------------- */
/* Mount                                                                      */
/* -------------------------------------------------------------------------- */
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    {/* Outermost boundary — catches anything that even RootProvider throws
        during render, e.g. a broken context. Renders a bare fallback since
        the toast system isn't available yet. */}
    <ErrorBoundary label="outer">
      <RootProvider>
        <App />
      </RootProvider>
    </ErrorBoundary>
  </StrictMode>,
);
