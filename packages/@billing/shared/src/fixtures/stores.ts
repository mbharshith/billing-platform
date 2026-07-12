// FIXTURE — demo tenants. Scrap when the real backend is live.

// Three tenants chosen to look OBVIOUSLY separate (₹ fashion, ₹ restaurant,
// $ luxury boutique) so the multi-tenancy story is unmistakable in demos.
import type { Store } from '@billing/shared/domain/types';

const now = (): string => new Date().toISOString();

// Well-known store ids referenced by other fixture files (users, products,
//  customers, sales) so they can join back to the right tenant.
export const SEED_STORE_MAIN_ID   = 'store-velvet';
export const SEED_STORE_BRANCH_ID = 'store-spiceroute';
export const SEED_STORE_THIRD_ID  = 'store-lamaison';

export const SEED_STORES: readonly Store[] = [
  {
    id: SEED_STORE_MAIN_ID,
    name: 'Velvet Mumbai Flagship',
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
    name: 'Spice Route Kitchen',
    city: 'Bengaluru',
    phone: '+91 80 4700 2000',
    address: 'Indiranagar 100 Feet Road, Bengaluru 560038',
    taxRate: 0.05,          // GST 5% on restaurant food
    currency: 'INR',
    active: true,
    status: 'active',
    createdAt: now(),
  },
  {
    id: SEED_STORE_THIRD_ID,
    name: 'La Maison Boutique',
    city: 'New York',
    phone: '+1 (212) 555-0190',
    address: '157 Spring St, SoHo, New York, NY 10012',
    taxRate: 0.08875,       // NYC combined tax 8.875%
    currency: 'USD',
    active: true,
    status: 'active',
    createdAt: now(),
  },
];
