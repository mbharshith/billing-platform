// useStorefrontMoney - currency-formatting hook for the customer shop.
// Mirrors useMoney() from the auth'd side, but pulls the currency from the
// URL-resolved tenant (no session available - customers aren't logged in).
import { useMemo } from 'react';
import { formatMoney, formatMoneyCompact } from '@shared/domain/format';
import { useStorefrontTenant } from './StorefrontTenantContext';

export const useStorefrontMoney = () => {
  const tenant = useStorefrontTenant();
  return useMemo(() => ({
    money:        (n: number) => formatMoney(n, tenant.currency),
    moneyCompact: (n: number) => formatMoneyCompact(n, tenant.currency),
    currency:     tenant.currency,
    taxRate:      tenant.taxRate,
  }), [tenant.currency, tenant.taxRate]);
};
