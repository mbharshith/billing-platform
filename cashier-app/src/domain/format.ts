/**
 * Formatting helpers. No hardcoded locales — use Intl (§11).
 */

/**
 * Money formatter — decimal-only per user request, no currency symbol.
 * Locale is still en-US so we get the correct thousands separator.
 */
const moneyFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-US');

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFmt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeStyle: 'short',
});

export const money = (n: number): string => moneyFmt.format(n);
export const num = (n: number): string => numberFmt.format(n);
export const fmtDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));
export const fmtDate = (iso: string): string => dateFmt.format(new Date(iso));
export const fmtTime = (iso: string): string => timeFmt.format(new Date(iso));

/** Format a US phone as XXX-XXX-XXXX, up to 10 digits. */
export const formatPhone = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

export const digitsOnly = (raw: string): string => raw.replace(/\D/g, '');

export const isValidPhone = (raw: string): boolean =>
  digitsOnly(raw).length === 10;

/** Produce a 1-2 char monogram from a product name.
 *  Preserves digits so "Item 1" → "I1" instead of collapsing to "I". */
export const monogramFor = (name: string): string => {
  const tokens = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return '?';
  const stopWords = new Set(['the', 'of', 'and', 'a']);
  const first = tokens[0];
  const rest = tokens.slice(1).filter((w) => !stopWords.has(w.toLowerCase()));
  // Prefer initial+first-char-of-second-word (e.g. "Ravi Kumar" → "RK").
  // If the second token is numeric, use the full digit (up to 2 chars) so
  // "Item 1" → "I1", "Item 12" → "I12" ... capped to 3 chars for fit.
  const head = first[0].toUpperCase();
  if (rest.length === 0) {
    return (first.slice(0, 2)).toUpperCase();
  }
  const second = rest[0];
  if (/^\d+$/.test(second)) {
    return (head + second).slice(0, 3);
  }
  return (head + second[0]).toUpperCase();
};

/** Human-friendly invoice number. */
export const nextInvoiceNo = (): string =>
  'WM-' + Date.now().toString().slice(-8);
