/**
 * RootProvider — composes every context in the correct order.
 * Order matters: AuthProvider needs UsersProvider above it.
 */
import type { FC, ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { CustomersProvider } from './CustomersContext';
import { ProductsProvider } from './ProductsContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { ToastProvider } from './ToastContext';
import { UsersProvider } from './UsersContext';

export const RootProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <ToastProvider>
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
    </ToastProvider>
  </SettingsProvider>
);
