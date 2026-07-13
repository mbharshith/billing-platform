// BRAND — single source of truth for product identity (text).
// Visual tokens live in src/styles/theme.css.
//
// EVERYTHING externally visible MUST flow from this object.
// If you find a hardcoded product name anywhere in src/, that's a bug.
//
// Renaming the product == editing THIS FILE.

export const BRAND = {
  // Product identity

  // Bare product name. Used in nav, footer, tab titles, email subjects.
  name:         'Outletly',

  // The two halves of the wordmark. `accent` renders FIRST (in gold Fraunces *  italic via <em>), `neutral` renders after in ink sans. The 'O' takes the *  gold slot because it's the meaningful glyph — italic Fraunces stylises *  the O just enough to read as a mark while the rest sits in ink sans.
  wordmark: {
    accent:     'O',
    neutral:    'utletly',
  },

  // Marketing suite/platform label. Sits above hero, in eyebrows, footer.
  platformName: 'Outletly Commerce OS',

  // One-line pitch under the wordmark on auth / marketing surfaces.
  // Every outlet is a first-class citizen — its own menu, kitchen,
  // recipes, customers, lending book. That's the whole differentiator.
  tagline:      'Every outlet, its own book.',

  // The editorial headline for the marketing hero. Two halves so the second *  half can render italic + gold in the serif.
  heroHeadline: {
    lead:       'Every outlet,',
    accent:     'its own book.',
  },

  // Product-descriptor for tab titles (`<Brand> · <Product Label>`).
  productLabel: 'Commerce OS',

  // Combined title used in <title> tags.
  fullTitle:    'Outletly · Commerce OS',

  // Parent org + contact
  // Outletly is a demo project — the "parent org" fields here are * placeholder-y on purpose so the marketing page renders complete * without inventing a fake company footprint. Swap in real values * if this ever ships as a commercial product.

  parentOrg:    'Outletly Labs',

  contact: {
    salesEmail:   'hello@outletly.app',
    supportEmail: 'support@outletly.app',
    hqCity:       'Bengaluru',
    hqRegion:     'Karnataka',
    offices: [
      {
        label:   'Studio',
        name:    'Outletly Labs',
        lines:   ['Bengaluru, Karnataka', 'India'],
      },
    ],
  },

  // Persistence identifiers - CAREFUL when changing

  // Dexie DB name. INTENTIONALLY kept as 'quickbill' across rebrands — *  changing it would orphan every existing tenant's local data *  (products, sales, customers, users, stores). If a future rename ever *  needs to touch this, ship a migration that opens the old DB, copies *  every table, then deletes the old DB.
  dbName:        'quickbill',

  // Prefix for localStorage / sessionStorage keys. Same reasoning as dbName *  — renaming loses session, theme, and settings state for every user.
  storagePrefix: 'quickbill',

  // Base domain for the storefront. Subdomains under this map to tenant slugs.
  platformApex:  'outletly.app',
} as const;

export type Brand = typeof BRAND;
