// tenantTheme - deterministic per-tenant accent palette.
// Well-known brands get their signature colors; unknowns get a hash-picked palette.

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

const BRAND_MAP: Record<string, TenantTheme> = {
  'store-myntra': {
    accent: '#ff3f6c', accentHover: '#e13560', accentSoft: 'rgba(255, 63, 108, 0.10)',
    onAccent: '#fff',
    heroFrom: '#ff3f6c', heroTo: '#ff905a',
    deliveryEta: '2-3 days', deliveryEtaShort: '2 days',
    tagline: 'Fashion delivered to your door',
  },
  'store-flipkart': {
    accent: '#2874f0', accentHover: '#1e5fc2', accentSoft: 'rgba(40, 116, 240, 0.10)',
    onAccent: '#fff',
    heroFrom: '#2874f0', heroTo: '#5b9bff',
    deliveryEta: 'Same-day', deliveryEtaShort: 'today',
    tagline: 'Explore Plus. Shop the world.',
  },
  'store-walmart': {
    accent: '#0071dc', accentHover: '#005ab8', accentSoft: 'rgba(0, 113, 220, 0.10)',
    onAccent: '#fff',
    heroFrom: '#0071dc', heroTo: '#ffc220',
    deliveryEta: '2-hour delivery', deliveryEtaShort: '2h',
    tagline: 'Save money. Live better.',
  },
};

// Fallback palette pool for unknown tenants.
const FALLBACK_POOL: ReadonlyArray<Pick<TenantTheme, 'accent' | 'accentHover' | 'heroTo'>> = [
  { accent: '#10b981', accentHover: '#0f9b73', heroTo: '#34d399' }, // emerald
  { accent: '#8b5cf6', accentHover: '#7047d8', heroTo: '#a78bfa' }, // violet
  { accent: '#f59e0b', accentHover: '#d68906', heroTo: '#fbbf24' }, // amber
  { accent: '#ef4444', accentHover: '#d43737', heroTo: '#f87171' }, // red
  { accent: '#06b6d4', accentHover: '#0596b0', heroTo: '#22d3ee' }, // cyan
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
