/**
 * ProductsContext — catalog CRUD + stock adjustments.
 * Persisted in localStorage. Seeded from SEED_PRODUCTS on first run.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { SEED_PRODUCTS } from '../domain/catalog';
import { storage } from '../lib/storage';
import type { BadgeTone, Product, ProductCategory } from '../domain/types';

const STORAGE_KEY = 'products';

export interface ProductInput {
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly category: ProductCategory;
  readonly tone: BadgeTone;
  readonly stock: number;
}

type CreateResult =
  | { readonly ok: true; readonly product: Product }
  | { readonly ok: false; readonly error: 'duplicateSku' };

interface ProductsContextValue {
  readonly products: readonly Product[];
  readonly activeProducts: readonly Product[];
  readonly byId: (id: string) => Product | undefined;
  readonly create: (input: ProductInput) => CreateResult;
  readonly update: (id: string, patch: Partial<ProductInput>) => CreateResult;
  readonly setActive: (id: string, active: boolean) => void;
  readonly decrementStock: (deltas: ReadonlyArray<{ productId: string; qty: number }>) => void;
  readonly incrementStock: (deltas: ReadonlyArray<{ productId: string; qty: number }>) => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export const ProductsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<readonly Product[]>(
    () => storage.load<readonly Product[]>(STORAGE_KEY, SEED_PRODUCTS),
  );

  useEffect(() => { storage.save(STORAGE_KEY, products); }, [products]);

  const byId = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  const create = useCallback((input: ProductInput): CreateResult => {
    const sku = input.sku.trim();
    const duplicate = products.some((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (duplicate) return { ok: false, error: 'duplicateSku' };
    const product: Product = {
      ...input,
      id: crypto.randomUUID(),
      sku,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [product, ...prev]);
    return { ok: true, product };
  }, [products]);

  const update = useCallback((id: string, patch: Partial<ProductInput>): CreateResult => {
    const target = products.find((p) => p.id === id);
    if (!target) return { ok: false, error: 'duplicateSku' };
    if (patch.sku && patch.sku.trim().toLowerCase() !== target.sku.toLowerCase()) {
      const duplicate = products.some(
        (p) => p.id !== id && p.sku.toLowerCase() === patch.sku!.trim().toLowerCase(),
      );
      if (duplicate) return { ok: false, error: 'duplicateSku' };
    }
    const next: Product = { ...target, ...patch, sku: (patch.sku ?? target.sku).trim() };
    setProducts((prev) => prev.map((p) => p.id === id ? next : p));
    return { ok: true, product: next };
  }, [products]);

  const setActive = useCallback((id: string, active: boolean) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, active } : p));
  }, []);

  const decrementStock: ProductsContextValue['decrementStock'] = useCallback((deltas) => {
    setProducts((prev) => prev.map((p) => {
      const d = deltas.find((x) => x.productId === p.id);
      if (!d) return p;
      return { ...p, stock: Math.max(p.stock - d.qty, 0) };
    }));
  }, []);

  const incrementStock: ProductsContextValue['incrementStock'] = useCallback((deltas) => {
    setProducts((prev) => prev.map((p) => {
      const d = deltas.find((x) => x.productId === p.id);
      if (!d) return p;
      return { ...p, stock: p.stock + d.qty };
    }));
  }, []);

  const value = useMemo<ProductsContextValue>(() => ({
    products,
    activeProducts: products.filter((p) => p.active),
    byId, create, update, setActive, decrementStock, incrementStock,
  }), [products, byId, create, update, setActive, decrementStock, incrementStock]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export const useProducts = (): ProductsContextValue => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within <ProductsProvider>');
  return ctx;
};
