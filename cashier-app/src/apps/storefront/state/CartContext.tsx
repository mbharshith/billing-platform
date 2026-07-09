// CartContext - customer's basket for the storefront, keyed per tenant.
// Lives in localStorage so a shopper's cart survives page reloads (industry
// standard - Shopify, Amazon, everyone does this). Per-tenant scoping means
// Myntra's cart and Walmart's cart don't collide in the same browser.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { storage } from '@shared/lib/storage';
import type { Product } from '@shared/domain/types';
import { useStorefrontTenant } from './StorefrontTenantContext';

export interface CartLine {
  readonly productId: string;
  readonly quantity: number;
}

interface CartContextValue {
  readonly lines: readonly CartLine[];
  readonly itemCount: number;
  readonly quantityOf: (productId: string) => number;
  readonly add: (productId: string, qty?: number) => void;
  readonly setQty: (productId: string, qty: number) => void;
  readonly remove: (productId: string) => void;
  readonly clear: () => void;
}

const Ctx = createContext<CartContextValue | null>(null);

const storageKey = (storeId: string): string => `cart::${storeId}`;

export const CartProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const tenant = useStorefrontTenant();
  const [lines, setLines] = useState<readonly CartLine[]>(
    () => storage.load<readonly CartLine[]>(storageKey(tenant.id), []),
  );

  // Reload from storage whenever the tenant changes (subdomain / slug swap).
  useEffect(() => {
    setLines(storage.load<readonly CartLine[]>(storageKey(tenant.id), []));
  }, [tenant.id]);

  // Persist any change immediately - customers hate losing a cart on refresh.
  useEffect(() => {
    storage.save(storageKey(tenant.id), lines);
  }, [tenant.id, lines]);

  const add = useCallback((productId: string, qty: number = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => l.productId === productId
          ? { ...l, quantity: l.quantity + qty }
          : l);
      }
      return [...prev, { productId, quantity: qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => l.productId === productId ? { ...l, quantity: qty } : l));
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const quantityOf = useCallback(
    (productId: string) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({ lines, itemCount, quantityOf, add, setQty, remove, clear }),
    [lines, itemCount, quantityOf, add, setQty, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
};

// Derive the fully-priced cart (lines + subtotal + tax + total) given the current
// product catalog. Kept as a pure helper so it can be reused in Cart + Checkout + Confirmation.
export interface PricedCartLine {
  readonly product: Product;
  readonly quantity: number;
  readonly lineTotal: number;
}

export interface PricedCart {
  readonly lines: readonly PricedCartLine[];
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly unitCount: number;
}

export const priceCart = (
  cartLines: readonly CartLine[],
  products: readonly Product[],
  taxRate: number,
): PricedCart => {
  const productById = new Map(products.map((p) => [p.id, p]));
  const lines: PricedCartLine[] = [];
  let subtotal = 0;
  let unitCount = 0;
  for (const cl of cartLines) {
    const product = productById.get(cl.productId);
    if (!product) continue;  // silently drop orphaned lines (product delisted)
    const lineTotal = product.price * cl.quantity;
    subtotal += lineTotal;
    unitCount += cl.quantity;
    lines.push({ product, quantity: cl.quantity, lineTotal });
  }
  const tax = subtotal * taxRate;
  return { lines, subtotal, tax, total: subtotal + tax, unitCount };
};
