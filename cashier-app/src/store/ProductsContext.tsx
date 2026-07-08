/**
 * ProductsContext — store-scoped catalog CRUD + stock adjustments.
 *
 * All reads (`products`, `activeProducts`) are filtered to the current store.
 * All writes require a `storeId` (defaults to the current store).
 * The full unfiltered list is exposed as `allProducts` for super-admin views.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { SEED_PRODUCTS } from '../domain/catalog';
import { SEED_STORE_MAIN_ID } from '../domain/seed';
import { storage } from '../lib/storage';
import type { BadgeTone, Product, ProductCategory } from '../domain/types';
import { useCurrentStoreId } from './AuthContext';

const STORAGE_KEY = 'products';

export interface ProductInput {
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly category: ProductCategory;
  readonly tone: BadgeTone;
  readonly stock: number;
  /** Defaults to the current store. Only super_admin should override. */
  readonly storeId?: string;
}

type CreateResult =
  | { readonly ok: true; readonly product: Product }
  | { readonly ok: false; readonly error: 'duplicateSku' | 'noStore' };

interface ProductsContextValue {
  /** Store-scoped view (filtered by currentStoreId). */
  readonly products: readonly Product[];
  readonly activeProducts: readonly Product[];
  /** Unfiltered — for super-admin cross-store views. */
  readonly allProducts: readonly Product[];
  readonly byId: (id: string) => Product | undefined;
  readonly create: (input: ProductInput) => CreateResult;
  readonly update: (id: string, patch: Partial<ProductInput>) => CreateResult;
  readonly setActive: (id: string, active: boolean) => void;
  readonly decrementStock: (deltas: ReadonlyArray<{ productId: string; qty: number }>) => void;
  readonly incrementStock: (deltas: ReadonlyArray<{ productId: string; qty: number }>) => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/** Migration: any pre-multi-tenant product without a storeId lands in the main store. */
const migrate = (list: readonly Product[]): readonly Product[] =>
  list.map((p) => p.storeId ? p : { ...p, storeId: SEED_STORE_MAIN_ID });

export const ProductsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();

  const [products, setProducts] = useState<readonly Product[]>(
    () => migrate(storage.load<readonly Product[]>(STORAGE_KEY, SEED_PRODUCTS)),
  );

  useEffect(() => { storage.save(STORAGE_KEY, products); }, [products]);

  const scoped = useMemo(
    () => currentStoreId ? products.filter((p) => p.storeId === currentStoreId) : [],
    [products, currentStoreId],
  );

  const byId = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  const create = useCallback((input: ProductInput): CreateResult => {
    const storeId = input.storeId ?? currentStoreId;
    if (!storeId) return { ok: false, error: 'noStore' };
    const sku = input.sku.trim();
    const duplicate = products.some(
      (p) => p.storeId === storeId && p.sku.toLowerCase() === sku.toLowerCase(),
    );
    if (duplicate) return { ok: false, error: 'duplicateSku' };
    const product: Product = {
      id: crypto.randomUUID(),
      sku,
      name: input.name,
      price: input.price,
      category: input.category,
      tone: input.tone,
      stock: input.stock,
      active: true,
      createdAt: new Date().toISOString(),
      storeId,
    };
    setProducts((prev) => [product, ...prev]);
    return { ok: true, product };
  }, [products, currentStoreId]);

  const update = useCallback((id: string, patch: Partial<ProductInput>): CreateResult => {
    const target = products.find((p) => p.id === id);
    if (!target) return { ok: false, error: 'duplicateSku' };
    if (patch.sku && patch.sku.trim().toLowerCase() !== target.sku.toLowerCase()) {
      const duplicate = products.some(
        (p) => p.id !== id && p.storeId === target.storeId
          && p.sku.toLowerCase() === patch.sku!.trim().toLowerCase(),
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
    products: scoped,
    activeProducts: scoped.filter((p) => p.active),
    allProducts: products,
    byId, create, update, setActive, decrementStock, incrementStock,
  }), [scoped, products, byId, create, update, setActive, decrementStock, incrementStock]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export const useProducts = (): ProductsContextValue => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within <ProductsProvider>');
  return ctx;
};
