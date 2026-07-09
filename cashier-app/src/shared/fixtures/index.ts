/**
 * FIXTURES BARREL - single import point for all demo/seed data.
 *
 * Only THREE files may import from here:
 *   - @shared/lib/db-bootstrap    (first-run table seeding)
 *   - @shared/store/SalesContext  (empty-sales-list back-seeding)
 *   - @shared/store/SettingsContext (reset-to-defaults action)
 *
 * See ./README.md for the "how to scrap this folder" instructions.
 */
export { SEED_STORES, SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID } from './stores';
export { SEED_USERS }     from './users';
export { SEED_CUSTOMERS } from './customers';
export { SEED_PRODUCTS }  from './products';
export { buildDemoSales } from './sales';
export { DEFAULT_SETTINGS } from './settings';
