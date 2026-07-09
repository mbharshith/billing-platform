import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@shared/errors';
import { RootProvider } from '@shell/RootProvider';
import { Shell } from '@shell/Shell';
import '@styles/theme.css';
import '@styles/tokens.css';
import '@styles/globals.css';

/* -------------------------------------------------------------------------- */
/* Global safety nets                                                         */
/* -------------------------------------------------------------------------- */
/* Anything that escapes React's component tree (event handlers, timers,      */
/* rejected promises inside .then callbacks, IDB errors during Dexie writes)  */
/* lands here. We log loudly; toasts are surfaced once the shell is mounted.  */
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
    {/* Outermost boundary — catches anything even RootProvider throws.
        Renders the bare error card since the toast system isn't up yet. */}
    <ErrorBoundary label="outer">
      <RootProvider>
        <Shell />
      </RootProvider>
    </ErrorBoundary>
  </StrictMode>,
);
