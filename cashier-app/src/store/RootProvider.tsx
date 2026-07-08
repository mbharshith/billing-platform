/**
 * RootProvider — composes every context in the correct order.
 * Order matters:
 *   Users + Stores must be above Auth (Auth reads both to resolve session + store scope).
 *   Products / Customers / Sales must be BELOW Auth so they can call useCurrentStoreId().
 *
 * On first mount we wait for `bootstrapDb()` to finish (imports legacy
 * localStorage OR seeds fresh demo data) so no context flashes empty.
 * If IDB is unavailable (private mode / storage disabled) we show a
 * full-screen splash with a retry — never a blank white page.
 */
import { useCallback, useEffect, useState, type FC, type ReactNode } from 'react';
import { bootstrapDb } from '../lib/db-bootstrap';
import { AppSplash } from '../components/errors';
import { AuditProvider } from './AuditContext';
import { AuthProvider } from './AuthContext';
import { CustomersProvider } from './CustomersContext';
import { ProductsProvider } from './ProductsContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { StoresProvider } from './StoresContext';
import { ToastProvider } from './ToastContext';
import { UsersProvider } from './UsersContext';

type BootState = 'loading' | 'ready' | 'failed';

export const RootProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [boot, setBoot] = useState<BootState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBoot('loading');
    bootstrapDb()
      .then(() => { if (!cancelled) setBoot('ready'); })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[bootstrapDb] failed:', err);
        if (!cancelled) setBoot('failed');
      });
    return () => { cancelled = true; };
  }, [attempt]);

  const retryBoot = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <SettingsProvider>
      <ToastProvider>
        {boot === 'ready' ? (
          <StoresProvider>
            <UsersProvider>
              <AuthProvider>
                <AuditProvider>
                  <ProductsProvider>
                    <CustomersProvider>
                      <SalesProvider>
                        {children}
                      </SalesProvider>
                    </CustomersProvider>
                  </ProductsProvider>
                </AuditProvider>
              </AuthProvider>
            </UsersProvider>
          </StoresProvider>
        ) : (
          <AppSplash state={boot} onRetry={retryBoot} />
        )}
      </ToastProvider>
    </SettingsProvider>
  );
};
