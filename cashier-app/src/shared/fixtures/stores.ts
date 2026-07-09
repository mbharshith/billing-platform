/**
 * FIXTURE — demo tenants. Scrap when the real backend is live.
 *
 * Three tenants chosen to look OBVIOUSLY separate (₹ apparel, ₹ electronics,
 * $ grocery) so the multi-tenancy story is unmistakable in demos.
 */
import type { Store } from '@shared/domain/types';

const now = (): string => new Date().toISOString();

/** Well-known store ids referenced by other fixture files (users, products,
 *  customers, sales) so they can join back to the right tenant. */
export const SEED_STORE_MAIN_ID   = 'store-myntra';
export const SEED_STORE_BRANCH_ID = 'store-flipkart';
export const SEED_STORE_THIRD_ID  = 'store-walmart';

export const SEED_STORES: readonly Store[] = [
  {
    id: SEED_STORE_MAIN_ID,
    name: 'Myntra Mumbai Flagship',
    city: 'Mumbai',
    phone: '+91 22 4000 1000',
    address: 'Kamala Mills, Lower Parel, Mumbai 400013',
    taxRate: 0.18,          // GST 18%
    currency: 'INR',
    active: true,
    status: 'active',
    createdAt: now(),
  },
  {
    id: SEED_STORE_BRANCH_ID,
    name: 'Flipkart Bengaluru Central',
    city: 'Bengaluru',
    phone: '+91 80 4700 2000',
    address: 'Vaishnavi Summit, Bellandur, Bengaluru 560103',
    taxRate: 0.18,
    currency: 'INR',
    active: true,
    status: 'active',
    createdAt: now(),
  },
  {
    id: SEED_STORE_THIRD_ID,
    name: 'Walmart Springfield #4210',
    city: 'Springfield',
    phone: '+1 (417) 555-0100',
    address: '3520 W Sunshine St, Springfield, MO 65807',
    taxRate: 0.0825,
    currency: 'USD',
    active: true,
    status: 'active',
    createdAt: now(),
  },
];
