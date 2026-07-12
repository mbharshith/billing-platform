// tenantTheme - deterministic per-tenant accent palette.
//
// Each seeded tenant gets a palette that matches its brand character;
// any unknown tenant falls back to the hash-picked pool below.
//
// tenants are our own boutique / restaurant / luxury brands and their
// palettes reflect that voice (jewel tones + terracotta + gold).

interface TenantTheme {
  readonly accent: string;        // primary CTA color
  readonly accentHover: string;   // slightly darker for :hover
  readonly accentSoft: string;    // 8-12% tint for chip backgrounds
  readonly onAccent: string;      // text/icon color on accent
  readonly heroFrom: string;      // hero gradient start
  readonly heroTo: string;        // hero gradient end
  readonly deliveryEta: string;   // "15 min" / "2 hours" - flavor per brand
  readonly deliveryEtaShort: string; // compact form for the pill
  readonly tagline: string;       // shown under brand in header
}

// Keys MUST match the store IDs in fixtures/stores.ts (SEED_STORE_*_ID).
// Adding a new seeded tenant? Add its palette here so it doesn't fall
// back to a random hash pick.
const BRAND_MAP: Record<string, TenantTheme> = {
  'store-velvet': {
    // Velvet Mumbai Flagship - luxury Indian fashion. Deep aubergine +
    // rose gold: reads as bridal / couture without being loud.
    accent: '#7c2d5a', accentHover: '#60214a', accentSoft: 'rgba(124, 45, 90, 0.10)',
    onAccent: '#fff',
    heroFrom: '#7c2d5a', heroTo: '#b8862a',
    deliveryEta: '2-3 days', deliveryEtaShort: '2 days',
    tagline: 'Couture, delivered.',
  },
  'store-spiceroute': {
    // Spice Route Kitchen - Indian non-veg restaurant. Warm terracotta +
    // saffron: appetite-driving without going full fast-food red.
    accent: '#c2410c', accentHover: '#9a3308', accentSoft: 'rgba(194, 65, 12, 0.10)',
    onAccent: '#fff',
    heroFrom: '#c2410c', heroTo: '#f59e0b',
    deliveryEta: '30-45 min', deliveryEtaShort: '30 min',
    tagline: 'Freshly plated, quickly delivered.',
  },
  'store-lamaison': {
    // La Maison Boutique - luxury SoHo boutique, USD. Ink black + gold:
    // the editorial-magazine aesthetic that matches the storefront chrome.
    accent: '#0a0a0a', accentHover: '#1f1f1f', accentSoft: 'rgba(10, 10, 10, 0.08)',
    onAccent: '#fff',
    heroFrom: '#0a0a0a', heroTo: '#b8862a',
    deliveryEta: '3-5 days', deliveryEtaShort: '3 days',
    tagline: 'Designer pieces, personally curated.',
  },
};

// Fallback palette pool for unknown tenants.
// All jewel/earthy tones - no primary-red or primary-blue big-box vibes.
const FALLBACK_POOL: ReadonlyArray<Pick<TenantTheme, 'accent' | 'accentHover' | 'heroTo'>> = [
  { accent: '#10b981', accentHover: '#0f9b73', heroTo: '#34d399' }, // emerald
  { accent: '#8b5cf6', accentHover: '#7047d8', heroTo: '#a78bfa' }, // violet
  { accent: '#f59e0b', accentHover: '#d68906', heroTo: '#fbbf24' }, // amber
  { accent: '#c2410c', accentHover: '#9a3308', heroTo: '#f97316' }, // terracotta
  { accent: '#0f766e', accentHover: '#0c5f58', heroTo: '#14b8a6' }, // teal
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function withAlpha(hex: string, alpha: number): string {
  // #rrggbb -> rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getTenantTheme(storeId: string): TenantTheme {
  if (BRAND_MAP[storeId]) return BRAND_MAP[storeId];
  const pick = FALLBACK_POOL[hashString(storeId) % FALLBACK_POOL.length];
  return {
    accent: pick.accent, accentHover: pick.accentHover,
    accentSoft: withAlpha(pick.accent, 0.10),
    onAccent: '#fff',
    heroFrom: pick.accent, heroTo: pick.heroTo,
    deliveryEta: 'Fast delivery', deliveryEtaShort: 'fast',
    tagline: 'Delivered to your door',
  };
}

// Emit CSS variables to scope the theme. Wrap this on a container element.
export function themeVars(theme: TenantTheme): React.CSSProperties {
  return {
    ['--app-accent' as string]: theme.accent,
    ['--app-accent-hover' as string]: theme.accentHover,
    ['--app-accent-soft' as string]: theme.accentSoft,
    ['--app-on-accent' as string]: theme.onAccent,
    ['--app-hero-from' as string]: theme.heroFrom,
    ['--app-hero-to' as string]: theme.heroTo,
  } as React.CSSProperties;
}
