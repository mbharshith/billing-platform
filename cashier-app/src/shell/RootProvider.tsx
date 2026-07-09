// RootProvider - composes every context in the correct order (see provider tree below). Waits for bootstrapDb() before first paint.
import { useCallback, useEffect, useState, type FC, type ReactNode } from 'react';
import { bootstrapDb } from '@shared/lib/db-bootstrap';
import { AppSplash } from '@shared/errors';
import { AuditProvider }     from '@shared/store/AuditContext';
import { AuthProvider }      from '@shared/store/AuthContext';
import { CustomersProvider } from '@shared/store/CustomersContext';
import { ProductsProvider }  from '@shared/store/ProductsContext';
import { SalesProvider }     from '@shared/store/SalesContext';
import { SettingsProvider }  from '@shared/store/SettingsContext';
import { StoresProvider }    from '@shared/store/StoresContext';
import { ToastProvider }     from '@shared/store/ToastContext';
import { UsersProvider }     from '@shared/store/UsersContext';

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
        // IndexedDB unavailable (private-mode Safari, locked storage): show retry splash.
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
