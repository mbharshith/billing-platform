/**
 * RootProvider — composes every context in the correct order.
 * Order matters:
 *   Users + Stores must be above Auth (Auth reads both to resolve session + store scope).
 *   Products / Customers / Sales must be BELOW Auth so they can call useCurrentStoreId().
 */
import type { FC, ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { CustomersProvider } from './CustomersContext';
import { ProductsProvider } from './ProductsContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { StoresProvider } from './StoresContext';
import { ToastProvider } from './ToastContext';
import { UsersProvider } from './UsersContext';

export const RootProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <ToastProvider>
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
    </ToastProvider>
  </SettingsProvider>
);
