// ProductsContext — Dexie-backed catalog, store-scoped.

// Products - live-queried on [storeId+sku] for current tenant. SKU uniqueness enforced at app layer for typed 'duplicateSku' errors.

// Stock adjustments run inside a single Dexie transaction to keep basket state consistent across reloads.
import {
  createContext, useCallback, useContext, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@shared/lib/db';
import type { BadgeTone, Product, ProductCategory } from '@shared/domain/types';
import { useCurrentStoreId } from './AuthContext';

export interface ProductInput {
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly category: ProductCategory;
  readonly tone: BadgeTone;
  readonly stock: number;
  readonly storeId?: string;
}

type CreateResult =
  | { readonly ok: true; readonly product: Product }
  | { readonly ok: false; readonly error: 'duplicateSku' | 'noStore' };

interface ProductsContextValue {
  readonly products: readonly Product[];
  readonly activeProducts: readonly Product[];
  readonly allProducts: readonly Product[];
  readonly byId: (id: string) => Product | undefined;
  readonly create: (input: ProductInput) => Promise<CreateResult>;
  readonly update: (id: string, patch: Partial<ProductInput>) => Promise<CreateResult>;
  readonly setActive: (id: string, active: boolean) => Promise<void>;
  readonly decrementStock: (
    deltas: ReadonlyArray<{ productId: string; qty: number }>,
  ) => Promise<void>;
  readonly incrementStock: (
    deltas: ReadonlyArray<{ productId: string; qty: number }>,
  ) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);
const EMPTY: readonly Product[] = [];

export const ProductsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();

  const scoped = useLiveQuery(
    async () => {
      if (!currentStoreId) return EMPTY;
      return db.products.where('storeId').equals(currentStoreId).toArray();
    },
    [currentStoreId],
    EMPTY,
  ) ?? EMPTY;

  const all = useLiveQuery(() => db.products.toArray(), [], EMPTY) ?? EMPTY;

  const byId = useCallback(
    (id: string) => scoped.find((p) => p.id === id) ?? all.find((p) => p.id === id),
    [scoped, all],
  );

  const create: ProductsContextValue['create'] = useCallback(async (input) => {
    const storeId = input.storeId ?? currentStoreId;
    if (!storeId) return { ok: false, error: 'noStore' };
    const sku = input.sku.trim();


    const exact = await db.products
      .where('[storeId+sku]').equals([storeId, sku]).first();
    const dup = exact ?? await db.products
      .where('storeId').equals(storeId)
      .filter((p) => p.sku.toLowerCase() === sku.toLowerCase())
      .first();
    if (dup) return { ok: false, error: 'duplicateSku' };

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
    await db.products.add(product);
    return { ok: true, product };
  }, [currentStoreId]);

  const update: ProductsContextValue['update'] = useCallback(async (id, patch) => {
    const target = await db.products.get(id);
    if (!target) return { ok: false, error: 'duplicateSku' };

    if (patch.sku && patch.sku.trim().toLowerCase() !== target.sku.toLowerCase()) {
      const dup = await db.products
        .where('storeId').equals(target.storeId)
        .filter((p) => p.id !== id
          && p.sku.toLowerCase() === patch.sku!.trim().toLowerCase())
        .first();
      if (dup) return { ok: false, error: 'duplicateSku' };
    }
    const next: Product = { ...target, ...patch, sku: (patch.sku ?? target.sku).trim() };
    await db.products.put(next);
    return { ok: true, product: next };
  }, []);

  const setActive = useCallback(async (id: string, active: boolean) => {
    await db.products.update(id, { active });
  }, []);

  // Bulk stock adjustments — one transaction, one round-trip.
  const applyDeltas = useCallback(
    async (
      deltas: ReadonlyArray<{ productId: string; qty: number }>,
      direction: 1 | -1,
    ) => {
      if (deltas.length === 0) return;
      await db.transaction('rw', db.products, async () => {
        for (const d of deltas) {
          const p = await db.products.get(d.productId);
          if (!p) continue;
          const next = direction === 1
            ? p.stock + d.qty
            : Math.max(p.stock - d.qty, 0);
          await db.products.update(d.productId, { stock: next });
        }
      });
    },
    [],
  );
  const decrementStock = useCallback(
    (deltas: ReadonlyArray<{ productId: string; qty: number }>) => applyDeltas(deltas, -1),
    [applyDeltas],
  );
  const incrementStock = useCallback(
    (deltas: ReadonlyArray<{ productId: string; qty: number }>) => applyDeltas(deltas, 1),
    [applyDeltas],
  );

  const value = useMemo<ProductsContextValue>(() => ({
    products: scoped,
    activeProducts: scoped.filter((p) => p.active),
    allProducts: all,
    byId, create, update, setActive, decrementStock, incrementStock,
  }), [scoped, all, byId, create, update, setActive, decrementStock, incrementStock]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export const useProducts = (): ProductsContextValue => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within <ProductsProvider>');
  return ctx;
};
