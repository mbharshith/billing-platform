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
  name:         'Registro',

  /** The two halves of the wordmark. `accent` renders FIRST (in gold Fraunces
   *  italic via <em>), `neutral` renders after in ink sans. The 'R' takes the
   *  gold slot because it's the meaningful glyph — italic Fraunces stylises
   *  the R just enough to read as a mark while the rest sits in ink sans. */
  wordmark: {
    accent:     'R',
    neutral:    'egistro',
  },

  /** Marketing suite/platform label. Sits above hero, in eyebrows, footer. */
  platformName: 'Registro Retail OS',

  /** One-line pitch under the wordmark on auth / marketing surfaces. */
  tagline:      'One ledger. Every register. Every channel.',

  /** The editorial headline for the marketing hero. Two halves so the second
   *  half can render italic + gold in the serif. */
  heroHeadline: {
    lead:       'Retail commerce,',
    accent:     'unified.',
  },

  /** Product-descriptor for tab titles (`<Brand> · <Product Label>`). */
  productLabel: 'Sales Register',

  /** Combined title used in <title> tags. */
  fullTitle:    'Registro · Sales Register',

  /* ---------------------------------------------------------------- */
  /* Parent org + contact                                             */
  /* ---------------------------------------------------------------- */
  /* Registro is a demo project — the "parent org" fields here are
   * placeholder-y on purpose so the marketing page renders complete
   * without inventing a fake company footprint. Swap in real values
   * if this ever ships as a commercial product.                     */

  parentOrg:    'Registro Labs',

  contact: {
    salesEmail:   'hello@registro.dev',
    supportEmail: 'support@registro.dev',
    hqCity:       'Bengaluru',
    hqRegion:     'Karnataka',
    offices: [
      {
        label:   'Studio',
        name:    'Registro Labs',
        lines:   ['Bengaluru, Karnataka', 'India'],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Persistence identifiers - CAREFUL when changing                  */
  /* ---------------------------------------------------------------- */

  /** Dexie DB name. INTENTIONALLY kept as 'quickbill' across rebrands —
   *  changing it would orphan every existing tenant's local data
   *  (products, sales, customers, users, stores). If a future rename ever
   *  needs to touch this, ship a migration that opens the old DB, copies
   *  every table, then deletes the old DB. */
  dbName:        'quickbill',

  /** Prefix for localStorage / sessionStorage keys. Same reasoning as dbName
   *  — renaming loses session, theme, and settings state for every user. */
  storagePrefix: 'quickbill',

  /** Base domain for the storefront. Subdomains under this map to tenant slugs. */
  platformApex:  'registro.shop',
} as const;

export type Brand = typeof BRAND;
