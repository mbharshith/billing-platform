/**
 * RootProvider — composes every context in the correct order.
 * Order matters:
 *   Users + Stores must be above Auth (Auth reads both to resolve session + store scope).
 *   Products / Customers / Sales must be BELOW Auth so they can call useCurrentStoreId().
 *
 * On first mount we wait for `bootstrapDb()` to finish (imports legacy
 * localStorage OR seeds fresh demo data) so no context flashes empty.
 * The gate paints a tiny loader instead of rendering the app twice.
 */
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { bootstrapDb } from '../lib/db-bootstrap';
import { AuthProvider } from './AuthContext';
import { CustomersProvider } from './CustomersContext';
import { ProductsProvider } from './ProductsContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { StoresProvider } from './StoresContext';
import { ToastProvider } from './ToastContext';
import { UsersProvider } from './UsersContext';

/** Tiny blocker so nothing paints before the DB is ready.
 *  In production this should be a splash screen with the brand mark. */
const BootGate: FC<{ ready: boolean; children: ReactNode }> = ({ ready, children }) => {
  if (!ready) return null;
  return <>{children}</>;
};

export const RootProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootstrapDb()
      .catch((err) => {
        // If IDB is disabled (private mode Safari etc.) fall through — the
        // app will render but writes will silently fail. TODO: user toast.
        // eslint-disable-next-line no-console
        console.error('bootstrapDb failed:', err);
      })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsProvider>
      <ToastProvider>
        <BootGate ready={ready}>
          <StoresProvider>
            <UsersProvider>
              <AuthProvider>
                <ProductsProvider>
                  <CustomersProvider>
                    <SalesProvider>
                      {children}
                    </SalesProvider>
                  </CustomersProvider>
                </ProductsProvider>
              </AuthProvider>
            </UsersProvider>
          </StoresProvider>
        </BootGate>
      </ToastProvider>
    </SettingsProvider>
  );
};
