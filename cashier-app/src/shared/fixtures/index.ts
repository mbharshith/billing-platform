// FIXTURES BARREL - single import point for all demo/seed data.

// Fixtures barrel. Only three files may import: db-bootstrap, SalesContext (back-seed), SettingsContext (reset).

// See ./README.md for the "how to scrap this folder" instructions.
export { SEED_STORES, SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID } from './stores';
export { SEED_USERS }     from './users';
export { SEED_CUSTOMERS } from './customers';
export { SEED_PRODUCTS }  from './products';
export { buildDemoSales } from './sales';
export { DEFAULT_SETTINGS } from './settings';
