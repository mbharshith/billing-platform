// BRAND - single source of truth for product identity (text). Visual tokens live in src/styles/theme.css.

export const BRAND = {
  // Primary product name - used in headers, footers, email subjects.
  name:       'QuickBill',

  // One-line pitch under the wordmark on login + marketing surfaces.
  tagline:    'Fast, friendly checkout.',

  // Suffix classifying the current shell (tab titles). Will be per-shell once split (Counter/Storefront/Fulfillment/Rider).
  productLabel: 'Cashier POS',

  // Combined title for <title> tags.
  fullTitle:  'QuickBill \u00b7 Cashier POS',

  // Persistence identifiers - CAREFUL when changing.
  // Dexie DB name. Renaming ORPHANS all local data - ship a migration.
  dbName:     'quickbill',

  // Prefix for localStorage / sessionStorage keys. Namespaces multiple products on one origin.
  storagePrefix: 'quickbill',

  // Base domain for the storefront. Subdomains under this map to tenant slugs.
  platformApex: 'quickbill.shop',
} as const;

export type Brand = typeof BRAND;
