/**
 * useMoney \u2014 tenant-currency-aware money formatter.
 *
 * Reads the current tenant from AuthContext, looks up its currency in
 * StoresContext, and returns a function that formats any number with the
 * proper currency symbol and precision. This is the ONLY money formatter
 * that UI components should use \u2014 it keeps display in sync with the tenant
 * the user is logged into.
 *
 * Fallback: if the user hasn't picked a tenant yet (login/signup) it falls
 * back to USD so we never crash on a null context.
 */
import { useCallback } from 'react';
import { formatMoney, formatMoneyCompact } from '@shared/domain/format';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';

const FALLBACK_CURRENCY = 'USD';

interface UseMoney {
  /** Format an amount using the current tenant's currency. */
  readonly money: (amount: number) => string;
  /** Same as `money`, but K/M/B compact — e.g. ₹281,867 -> '₹282K'. */
  readonly moneyCompact: (amount: number) => string;
  /** The ISO code currently in use (e.g. `'INR'`). */
  readonly currency: string;
}

export const useMoney = (): UseMoney => {
  const { currentStoreId } = useAuth();
  const { byId } = useStores();
  const currency = byId(currentStoreId)?.currency ?? FALLBACK_CURRENCY;
  const money        = useCallback((n: number) => formatMoney(n, currency),        [currency]);
  const moneyCompact = useCallback((n: number) => formatMoneyCompact(n, currency), [currency]);
  return { money, moneyCompact, currency };
};
