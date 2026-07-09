/**
 * BRAND — single source of truth for product identity (text side).
 *
 * Every user-visible product name, tagline, tab-title suffix, DB name,
 * and storage-prefix in the app derives from THIS FILE. To rename the
 * product, edit here and rebuild — nothing else.
 *
 * Colors, fonts, and other visual identity live in
 * `src/styles/theme.css` — that is the ONE swap point for the theme.
 * Keep the two files aligned when you rebrand.
 *
 * DO NOT hardcode the product name anywhere else. If you need it in a
 * component, import { BRAND } from '../shared/brand' (or thread it via
 * STRINGS.brand which re-exports these fields).
 */

export const BRAND = {
  /** Primary product name — used in headers, footers, email subjects. */
  name:       'QuickBill',

  /** One-line pitch under the wordmark on login + marketing surfaces. */
  tagline:    'Fast, friendly checkout.',

  /** Suffix that classifies the current shell (used in tab titles etc.).
   *  When we split into multiple sub-apps this becomes per-shell:
   *  Counter POS, Storefront, Fulfillment, Rider. */
  productLabel: 'Cashier POS',

  /** Combined title for <title> tags. */
  fullTitle:  'QuickBill · Cashier POS',

  /* --------------------------------------------------------------------- */
  /* Persistence identifiers — CAREFUL when changing                        */
  /* --------------------------------------------------------------------- */
  /** Dexie/IndexedDB database name. Changing this ORPHANS all existing
   *  local data — must ship a migration script if you rename. */
  dbName:     'quickbill',

  /** Prefix for keys we write to localStorage / sessionStorage.
   *  Namespacing lets multiple products coexist on the same origin
   *  during dev. Change → rebuild → old keys are ignored (not migrated). */
  storagePrefix: 'quickbill',
} as const;

export type Brand = typeof BRAND;
