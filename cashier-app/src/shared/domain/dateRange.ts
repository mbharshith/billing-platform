/**
 * Date-range helpers — resolve a DateRangeKey into a [from, to] window.
 * All boundaries are inclusive; "today" spans the local midnight-to-midnight window.
 */
import type { DateRangeKey } from '@shared/molecules';

export interface DateWindow {
  from: number;    // epoch ms (inclusive)
  to: number;      // epoch ms (exclusive — end of the window)
}

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Monday-based week start (ISO). Adjust the +1/-1 offsets if you want Sunday. */
const startOfWeek = (d: Date): Date => {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;   // Mon=0 … Sun=6
  return addDays(x, -dow);
};

const startOfMonth = (d: Date): Date => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

const startOfQuarter = (d: Date): Date => {
  const x = startOfMonth(d);
  x.setMonth(Math.floor(x.getMonth() / 3) * 3);
  return x;
};

export const resolveDateWindow = (
  key: DateRangeKey,
  now: Date = new Date(),
  customFrom?: string,
  customTo?: string,
): DateWindow | null => {
  if (key === 'all') return null;

  if (key === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : 0;
    // "to" is inclusive-end-of-day, so bump one day.
    const toDate = customTo ? addDays(new Date(`${customTo}T00:00:00`), 1) : new Date(8.64e15);
    return { from, to: toDate.getTime() };
  }

  const start =
    key === 'today'   ? startOfDay(now)
  : key === 'week'    ? startOfWeek(now)
  : key === 'month'   ? startOfMonth(now)
  : /* quarter */       startOfQuarter(now);

  return { from: start.getTime(), to: addDays(startOfDay(now), 1).getTime() };
};
