// productMeta - deterministic "commercial polish" metadata for a product.
// We synthesize ratings/discounts/etc from a hash of the product id so they're
// stable across renders but vary product-to-product. This lets the storefront
// feel like a real ecommerce app without needing a real ratings/pricing service.

import type { IconName } from '@shared/atoms';
import type { Product, ProductCategory } from '@shared/domain/types';

interface ProductMeta {
  /** 3.6 - 4.9, one decimal. */
  readonly rating: number;
  /** 32 - 12,400. */
  readonly reviewCount: number;
  /** Percentage 8 - 45. */
  readonly discountPct: number;
  /** MRP (before discount) computed from price + discountPct. */
  readonly originalPrice: number;
  /** Category-appropriate icon shown large on the product tile. */
  readonly icon: IconName;
  /** Gradient background used for the tile (paired with the product tone). */
  readonly gradientFrom: string;
  readonly gradientTo: string;
  /** Text color that contrasts with the gradient. */
  readonly onGradient: string;
}

function hashString(s: string, salt = 0): number {
  // FNV-1a variant with a salt seed. Gives good spread even for very short
  // strings that differ only in the last character (e.g. m01, m02, m03).
  let h = (salt ^ 2166136261) >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // One final scramble so downstream `% N` doesn't cluster.
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;  // final unsigned coerce so downstream `% N` is always positive
}

const ICON_MAP: Record<ProductCategory, IconName> = {
  Grocery:     'store',
  Produce:     'spark',
  Beverages:   'coins',
  Snacks:      'bag',
  Meat:        'chart',
  Frozen:      'zap',
  Household:   'shield',
  Personal:    'user',
  Electronics: 'card',
  Other:       'spark',
};

// Rich pastel-to-deep gradient pairs. Chosen to feel premium (not baby-tinted).
const TONE_GRADIENTS: Record<string, { from: string; to: string; ink: string }> = {
  sky:    { from: '#bae6fd', to: '#38bdf8', ink: '#0c4a6e' },
  amber:  { from: '#fde68a', to: '#f59e0b', ink: '#78350f' },
  yellow: { from: '#fef08a', to: '#eab308', ink: '#713f12' },
  red:    { from: '#fecaca', to: '#f87171', ink: '#7f1d1d' },
  stone:  { from: '#e7e5e4', to: '#a8a29e', ink: '#292524' },
  orange: { from: '#fdba74', to: '#f97316', ink: '#7c2d12' },
  brown:  { from: '#d3b58a', to: '#a16f3f', ink: '#3f1d05' },
  rose:   { from: '#fecdd3', to: '#fb7185', ink: '#881337' },
  slate:  { from: '#cbd5e1', to: '#64748b', ink: '#0f172a' },
  green:  { from: '#a7f3d0', to: '#10b981', ink: '#064e3b' },
};

export function getProductMeta(product: Product): ProductMeta {
  // Feed name+id so short IDs (m01/m02) don't dominate.
  // Different salts so rating / reviewCount / discount don't correlate.
  const key = product.id + '|' + product.name;
  const hRating = hashString(key, 1013);
  const hReviews = hashString(key, 7919);
  const hDiscount = hashString(key, 4241);

  const rating = 3.6 + ((hRating % 14) / 10);
  const reviewCount = 32 + (hReviews % 12_400);
  const discountPct = 8 + (hDiscount % 38);
  const originalPrice = Math.round(product.price / (1 - discountPct / 100));

  const grad = TONE_GRADIENTS[product.tone] ?? TONE_GRADIENTS.slate!;

  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    discountPct,
    originalPrice,
    icon: ICON_MAP[product.category] ?? 'bag',
    gradientFrom: grad.from,
    gradientTo: grad.to,
    onGradient: grad.ink,
  };
}

/** Compact review-count formatter. 1200 -> "1.2k", 12400 -> "12k". */
export function formatReviewCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

/**
 * Returns a human-readable delivery ETA. "2-3 days" -> "Tue, Jul 15"-style
 * date 2 days out. "Same-day" -> "Today". "2-hour delivery" -> "In 2 hours".
 */
export function friendlyDelivery(eta: string): string {
  const now = new Date();
  if (/same[- ]?day/i.test(eta)) return 'Today';
  if (/hour/i.test(eta)) return `In ${eta}`;
  const daysMatch = eta.match(/(\d+)/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]!, 10);
    const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return eta;
}
