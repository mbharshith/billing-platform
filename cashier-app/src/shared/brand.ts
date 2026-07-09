// BRAND — single source of truth for product identity (text).
// Visual tokens live in src/styles/theme.css.
//
// EVERYTHING externally visible that says "QuickBill" / "Commerce Cloud" /
// "Walmart Global Tech" / any of the contact addresses MUST flow from this
// object. If you find a hardcoded "QuickBill" anywhere in src/, that's a bug.
//
// Renaming the product == editing THIS FILE.

export const BRAND = {
  /* ---------------------------------------------------------------- */
  /* Product identity                                                 */
  /* ---------------------------------------------------------------- */

  /** Bare product name. Used in nav, footer, tab titles, email subjects. */
  name:         'QuickBill',

  /** The two halves of the wordmark — nav/footer render them separately so
   *  the second half can carry the accent color without italic artefacts. */
  wordmark: {
    first:      'Quick',
    accent:     'Bill',
  },

  /** Marketing suite/platform label. Sits above hero, in eyebrows, footer. */
  platformName: 'QuickBill Commerce Cloud',

  /** One-line pitch under the wordmark on auth / marketing surfaces. */
  tagline:      'Fast, friendly checkout.',

  /** The editorial headline for the marketing hero. Two halves so the second
   *  half can render italic + gold in the serif. */
  heroHeadline: {
    lead:       'Retail commerce,',
    accent:     'refined.',
  },

  /** Product-descriptor for tab titles (`<Brand> · <Product Label>`). */
  productLabel: 'Cashier POS',

  /** Combined title used in <title> tags. */
  fullTitle:    'QuickBill · Cashier POS',

  /* ---------------------------------------------------------------- */
  /* Parent org + contact                                             */
  /* ---------------------------------------------------------------- */

  parentOrg:    'Walmart Global Tech',

  contact: {
    salesEmail:   'quickbill-sales@walmart.com',
    supportEmail: 'quickbill-support@walmart.com',
    hqCity:       'Bentonville',
    hqRegion:     'Chennai',
    offices: [
      {
        label:   'Global HQ',
        name:    'Walmart Global Tech',
        lines:   ['702 SW 8th Street', 'Bentonville, AR 72716', 'United States'],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Persistence identifiers - CAREFUL when changing                  */
  /* ---------------------------------------------------------------- */

  /** Dexie DB name. Renaming ORPHANS all local data — ship a migration. */
  dbName:        'quickbill',

  /** Prefix for localStorage / sessionStorage keys. Namespaces multiple
   *  products on one origin. */
  storagePrefix: 'quickbill',

  /** Base domain for the storefront. Subdomains under this map to tenant slugs. */
  platformApex:  'quickbill.shop',
} as const;

export type Brand = typeof BRAND;
