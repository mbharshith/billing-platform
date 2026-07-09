// BRAND — single source of truth for product identity (text).
// Visual tokens live in src/styles/theme.css.
//
// EVERYTHING externally visible MUST flow from this object.
// If you find a hardcoded product name anywhere in src/, that's a bug.
//
// Renaming the product == editing THIS FILE.

export const BRAND = {
  /* ---------------------------------------------------------------- */
  /* Product identity                                                 */
  /* ---------------------------------------------------------------- */

  /** Bare product name. Used in nav, footer, tab titles, email subjects. */
  name:         '8services',

  /** The two halves of the wordmark. `accent` renders FIRST (in gold Fraunces
   *  italic via <em>), `neutral` renders after in ink sans. The '8' takes the
   *  gold slot because it's the meaningful glyph — rotated 90° it's infinity,
   *  and the italic Fraunces treatment stylises it enough to read as a mark. */
  wordmark: {
    accent:     '8',
    neutral:    'services',
  },

  /** Marketing suite/platform label. Sits above hero, in eyebrows, footer. */
  platformName: '8services Commerce Cloud',

  /** One-line pitch under the wordmark on auth / marketing surfaces. */
  tagline:      'Infinite services, one ledger.',

  /** The editorial headline for the marketing hero. Two halves so the second
   *  half can render italic + gold in the serif. */
  heroHeadline: {
    lead:       'Retail commerce,',
    accent:     'refined.',
  },

  /** Product-descriptor for tab titles (`<Brand> · <Product Label>`). */
  productLabel: 'Cashier POS',

  /** Combined title used in <title> tags. */
  fullTitle:    '8services · Cashier POS',

  /* ---------------------------------------------------------------- */
  /* Parent org + contact                                             */
  /* ---------------------------------------------------------------- */

  parentOrg:    '8services',

  contact: {
    salesEmail:   '8services-sales@8services.com',
    supportEmail: '8services-support@8services.com',
    hqCity:       'Bengaluru',
    hqRegion:     'Karnataka',
    offices: [
      {
        label:   'Global HQ',
        name:    '8services Global Tech',
        lines:   ['Bengaluru, Karnataka', 'India'],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Persistence identifiers - CAREFUL when changing                  */
  /* ---------------------------------------------------------------- */

  /** Dexie DB name. INTENTIONALLY kept as 'quickbill' after the 8services
   *  rebrand — changing it would orphan every existing tenant's local data
   *  (products, sales, customers, users, stores). If a future rename ever
   *  needs to touch this, ship a migration that opens the old DB, copies
   *  every table, then deletes the old DB. */
  dbName:        'quickbill',

  /** Prefix for localStorage / sessionStorage keys. Same reasoning as dbName
   *  — renaming loses session, theme, and settings state for every user. */
  storagePrefix: 'quickbill',

  /** Base domain for the storefront. Subdomains under this map to tenant slugs. */
  platformApex:  '8services.shop',
} as const;

export type Brand = typeof BRAND;
