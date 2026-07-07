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

/** Produce a monogram (1–2 letters) from a product name. */
export const monogramFor = (name: string): string => {
  const words = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
  const stopWords = new Set(['the', 'of', 'and', 'a']);
  const first = words[0]?.[0] ?? '?';
  const second = words.find(
    (w, idx) => idx > 0 && !stopWords.has(w.toLowerCase()),
  )?.[0] ?? '';
  return (first + second).toUpperCase();
};

/** Human-friendly invoice number. */
export const nextInvoiceNo = (): string =>
  'WM-' + Date.now().toString().slice(-8);
