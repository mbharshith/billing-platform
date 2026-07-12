// Chart.js wrappers - beautifully themed, dark-mode aware, gradient-filled.
//
// Design notes:
//   1. Uses --app-* CSS custom props (project convention), NOT bare --surface.
//      Bare names fall back to white and looked garbage in dark mode.
//   2. Charts re-render on theme flip via a key that changes with data-theme.
//   3. Doughnut border/gap uses --app-surface so slice separators match
//      the card the chart sits inside.
//   4. Bar/Line charts get a canvas gradient built at render time -
//      much prettier than flat fills. Tension bumped to 0.4 for silky curves.
//   5. Tooltip: dark surface, rounded, with padded chips for legend items.
//   6. Legend: point-style dots (not squares), consistent spacing.
//   7. Grid lines: use --app-border-subtle for near-invisible axis grid.

import { type FC, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions,
  type ScriptableContext,
} from 'chart.js';
import cls from './charts.module.css';

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Tooltip,
);

/* -------------------------------------------------------------------------- */
/* Theme observer - forces every chart to re-render when data-theme flips.    */
/* -------------------------------------------------------------------------- */

const useThemeVersion = (): number => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => setV((x) => x + 1));
    obs.observe(target, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    // Also respond to prefers-color-scheme changes.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const bump = () => setV((x) => x + 1);
    media.addEventListener?.('change', bump);
    return () => { obs.disconnect(); media.removeEventListener?.('change', bump); };
  }, []);
  return v;
};

const readVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** Full theme palette - resolved fresh on every render (see useThemeVersion). */
interface ChartTheme {
  readonly palette: readonly string[];
  readonly surface: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSubtle: string;
  readonly tooltipBg: string;
  readonly tooltipFg: string;
  readonly gridColor: string;
}

const useChartTheme = (): ChartTheme => {
  const version = useThemeVersion();
  return useMemo<ChartTheme>(() => {
    const surface     = readVar('--app-surface',        '#ffffff');
    const surfaceInk  = readVar('--app-surface-ink',    '#0b1220');
    const border      = readVar('--app-border',         '#e5e7eb');
    const borderStrong= readVar('--app-border-strong',  '#cbd5e1');
    const textPrimary = readVar('--app-text',           readVar('--app-surface-ink', '#0b1220'));
    const textSubtle  = readVar('--app-text-subtle',    '#64748b');
    return {
      palette: [
        readVar('--app-primary',       '#3b82f6'),
        readVar('--app-success',       '#10b981'),
        readVar('--app-warning',       '#f59e0b'),
        readVar('--app-info',          '#06b6d4'),
        readVar('--app-danger',        '#ef4444'),
        readVar('--app-brand-violet',  '#8b5cf6'),
        readVar('--app-brand-pink',    '#ec4899'),
        readVar('--app-brand-teal',    '#14b8a6'),
      ],
      surface,
      border,
      textPrimary,
      textSubtle,
      tooltipBg: surfaceInk,
      tooltipFg: readVar('--app-primary-fg', '#ffffff'),
      gridColor: readVar('--app-border-subtle', border) + '55', // subtle even without a token
    };
    // version is used only to bust the memo; ignore the eslint 'unused' warning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
};

/* -------------------------------------------------------------------------- */
/* Utility: mix a hex colour with an alpha (0-1) for gradient endpoints.      */
/* -------------------------------------------------------------------------- */

const hexToRgba = (colour: string, alpha: number): string => {
  const c = colour.trim();
  if (c.startsWith('rgb')) {
    // rgb(r, g, b) or rgba(...) - swap alpha
    const parts = c.match(/[\d.]+/g);
    if (parts && parts.length >= 3) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  const hex = c.startsWith('#') ? c.slice(1) : c;
  const short = hex.length === 3;
  const r = parseInt(short ? hex[0]! + hex[0]! : hex.slice(0, 2), 16);
  const g = parseInt(short ? hex[1]! + hex[1]! : hex.slice(2, 4), 16);
  const b = parseInt(short ? hex[2]! + hex[2]! : hex.slice(4, 6), 16);
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
};

/** Build a top-to-bottom gradient inside the given canvas. */
const buildGradient = (
  ctx: ScriptableContext<'bar' | 'line'>,
  colour: string,
  fromAlpha = 0.85,
  toAlpha = 0.15,
): CanvasGradient | string => {
  const chart = ctx.chart;
  const area = chart.chartArea;
  if (!area) return colour;
  const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexToRgba(colour, fromAlpha));
  g.addColorStop(1, hexToRgba(colour, toAlpha));
  return g;
};

/* -------------------------------------------------------------------------- */
/* ChartFrame - shared chrome                                                 */
/* -------------------------------------------------------------------------- */

export interface ChartFrameProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly meta?: string;
  readonly children: ReactNode;
}
export const ChartFrame: FC<ChartFrameProps> = ({ title, subtitle, meta, children }) => (
  <div className={cls['chart-frame']}>
    {(title || subtitle || meta) && (
      <div className={cls['chart-frame__header']}>
        <div>
          {title    && <h3 className={cls['chart-frame__title']}>{title}</h3>}
          {subtitle && <p  className={cls['chart-frame__subtitle']}>{subtitle}</p>}
        </div>
        {meta && <span className={cls['chart-frame__meta']}>{meta}</span>}
      </div>
    )}
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Base options builder                                                       */
/* -------------------------------------------------------------------------- */

const buildBaseOpts = (theme: ChartTheme): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 700, easing: 'easeOutQuart' },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        boxWidth: 8,
        boxHeight: 8,
        padding: 14,
        usePointStyle: true,
        pointStyle: 'circle',
        color: theme.textSubtle,
        font: { size: 11, weight: 500 },
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: theme.tooltipBg,
      titleColor: theme.tooltipFg,
      bodyColor: theme.tooltipFg,
      borderColor: 'transparent',
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 6,
      titleFont: { size: 12, weight: 600 },
      bodyFont:  { size: 12, weight: 500 },
      caretSize: 6,
    },
  },
});

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
const sizeClass = (size: ChartSize = 'md'): string => cls[`chart--${size}`]!;

/* -------------------------------------------------------------------------- */
/* BarChart                                                                   */
/* -------------------------------------------------------------------------- */

export interface BarChartProps {
  readonly labels: readonly string[];
  readonly datasets: readonly { readonly label: string; readonly data: readonly number[] }[];
  readonly horizontal?: boolean;
  readonly size?: ChartSize;
  readonly stacked?: boolean;
  readonly showLegend?: boolean;
}

export const BarChart: FC<BarChartProps> = ({
  labels, datasets, horizontal, size, stacked, showLegend = true,
}) => {
  const theme = useChartTheme();
  const data = {
    labels: labels as string[],
    datasets: datasets.map((ds, i) => {
      const c = theme.palette[i % theme.palette.length]!;
      return {
        label: ds.label,
        data:  ds.data as number[],
        backgroundColor: (ctx: ScriptableContext<'bar'>) => buildGradient(ctx, c, 0.9, 0.25),
        hoverBackgroundColor: (ctx: ScriptableContext<'bar'>) => buildGradient(ctx, c, 1, 0.5),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 34,
      };
    }),
  };
  const base = buildBaseOpts(theme);
  const options: ChartOptions<'bar'> = {
    ...(base as ChartOptions<'bar'>),
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      ...base.plugins,
      legend: { ...(base.plugins?.legend as object), display: showLegend && datasets.length > 1 },
    },
    scales: {
      x: {
        stacked,
        grid: { display: !horizontal, color: theme.gridColor, drawTicks: false },
        border: { display: false },
        ticks: { color: theme.textSubtle, font: { size: 11 }, padding: 6 },
      },
      y: {
        stacked,
        beginAtZero: true,
        grid: { display: horizontal ? false : true, color: theme.gridColor, drawTicks: false },
        border: { display: false },
        ticks: { color: theme.textSubtle, font: { size: 11 }, padding: 8 },
      },
    },
  };
  return (
    <div className={`${cls.chart} ${sizeClass(size)}`}>
      <Bar key={theme.surface} data={data} options={options} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* LineChart                                                                  */
/* -------------------------------------------------------------------------- */

export interface LineChartProps {
  readonly labels: readonly string[];
  readonly datasets: readonly { readonly label: string; readonly data: readonly number[] }[];
  readonly size?: ChartSize;
  readonly fill?: boolean;
}

export const LineChart: FC<LineChartProps> = ({ labels, datasets, size, fill }) => {
  const theme = useChartTheme();
  const data = {
    labels: labels as string[],
    datasets: datasets.map((ds, i) => {
      const c = theme.palette[i % theme.palette.length]!;
      return {
        label: ds.label,
        data:  ds.data as number[],
        borderColor: c,
        backgroundColor: (ctx: ScriptableContext<'line'>) =>
          fill ? buildGradient(ctx, c, 0.55, 0.02) : hexToRgba(c, 0.9),
        fill: !!fill,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: c,
        pointHoverBorderColor: theme.surface,
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      };
    }),
  };
  const base = buildBaseOpts(theme);
  const options: ChartOptions<'line'> = {
    ...(base as ChartOptions<'line'>),
    interaction: { mode: 'index', intersect: false },
    plugins: {
      ...base.plugins,
      legend: { ...(base.plugins?.legend as object), display: datasets.length > 1 },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: theme.textSubtle, font: { size: 11 }, padding: 6, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: theme.gridColor, drawTicks: false },
        border: { display: false },
        ticks: { color: theme.textSubtle, font: { size: 11 }, padding: 8 },
      },
    },
  };
  return (
    <div className={`${cls.chart} ${sizeClass(size)}`}>
      <Line key={theme.surface} data={data} options={options} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DoughnutChart - with optional centre text                                  */
/* -------------------------------------------------------------------------- */

export interface DoughnutChartProps {
  readonly labels: readonly string[];
  readonly data: readonly number[];
  readonly size?: ChartSize;
  /** Big text in the middle of the donut (e.g. total). */
  readonly centerText?: string;
  /** Smaller line under centerText. */
  readonly centerSubtext?: string;
}

export const DoughnutChart: FC<DoughnutChartProps> = ({
  labels, data, size = 'md', centerText, centerSubtext,
}) => {
  const theme = useChartTheme();
  const wrapRef = useRef<HTMLDivElement>(null);

  const chartData = {
    labels: labels as string[],
    datasets: [{
      data: data as number[],
      backgroundColor: labels.map((_, i) => theme.palette[i % theme.palette.length]!),
      hoverBackgroundColor: labels.map((_, i) =>
        hexToRgba(theme.palette[i % theme.palette.length]!, 0.9)),
      borderColor: theme.surface,        // slice separators match card bg
      borderWidth: 3,
      hoverOffset: 8,
      spacing: 2,                        // tiny gap between slices
    }],
  };
  const base = buildBaseOpts(theme);
  const options: ChartOptions<'doughnut'> = {
    ...(base as ChartOptions<'doughnut'>),
    cutout: '72%',
    plugins: {
      ...base.plugins,
      tooltip: {
        ...(base.plugins?.tooltip as object),
        callbacks: {
          label: (ctx) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const value = ctx.parsed;
            const pct = total ? ((value / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${value.toLocaleString('en-IN')} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div ref={wrapRef} className={`${cls.chart} ${sizeClass(size)} ${cls['chart--donut-wrap']}`}>
      <Doughnut key={theme.surface} data={chartData} options={options} />
      {(centerText || centerSubtext) && (
        <div className={cls['donut-center']}>
          {centerText && <span className={cls['donut-center__value']}>{centerText}</span>}
          {centerSubtext && <span className={cls['donut-center__label']}>{centerSubtext}</span>}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* KPI card - big number stat tile with subtle glow                           */
/* -------------------------------------------------------------------------- */

export interface KPIProps {
  readonly label: string;
  readonly value: string;
  readonly delta?: number;
  readonly accentColor?: string;
}

export const KPICard: FC<KPIProps> = ({ label, value, delta, accentColor }) => {
  const style = accentColor ? { ['--kpi-accent' as string]: accentColor } : undefined;
  const deltaCls =
    delta === undefined ? cls['kpi__delta--flat']
    : delta > 0         ? cls['kpi__delta--up']
    : delta < 0         ? cls['kpi__delta--down']
    :                     cls['kpi__delta--flat'];
  const arrow =
    delta === undefined ? ''
    : delta > 0         ? '\u2191'
    : delta < 0         ? '\u2193'
    :                     '\u2013';
  return (
    <div className={cls.kpi} style={style as never}>
      <span className={cls.kpi__label}>{label}</span>
      <span className={cls.kpi__value}>{value}</span>
      {delta !== undefined && (
        <span className={`${cls.kpi__delta} ${deltaCls}`}>
          {arrow} {Math.abs(delta).toFixed(1)}% vs last period
        </span>
      )}
    </div>
  );
};

export const KPIRow: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={cls['kpi-row']}>{children}</div>
);
export const ChartGrid: FC<{ children: ReactNode; cols3?: boolean }> = ({ children, cols3 }) => (
  <div className={`${cls['chart-grid']} ${cols3 ? cls['chart-grid--3col'] : ''}`}>{children}</div>
);
