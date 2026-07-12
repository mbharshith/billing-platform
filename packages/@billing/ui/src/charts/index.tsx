// Chart.js wrappers - one-time register call, then thin React components.
//
// Why wrappers instead of using react-chartjs-2 directly?
//   1. Every chart in the app needs a fixed-height container (Chart.js
//      responsive:true ignores canvas height attribute)
//   2. Colours must come from CSS custom properties so dark mode auto-
//      matches. Avoids each caller hardcoding hex.
//   3. Every chart gets the same header/subtitle/meta chrome.
//
// Design tokens - the charts read these from CSS vars at render time:
//   --brand-primary, --success, --warning, --danger, --info

import { type FC, type ReactNode, useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions,
} from 'chart.js';
import cls from './charts.module.css';

// One-time register. Safe to call multiple times (Chart.js dedupes).
ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Tooltip,
);

/* -------------------------------------------------------------------------- */
/* Palette - fetched from CSS vars at render                                  */
/* Fallback hex keeps tests + SSR from crashing.                              */
/* -------------------------------------------------------------------------- */

const CSS_VAR = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** 6-slot palette used by every chart. Order picked for max contrast on both themes. */
const usePalette = (): readonly string[] => useMemo(() => [
  CSS_VAR('--brand-primary', '#2563eb'),
  CSS_VAR('--success',       '#16a34a'),
  CSS_VAR('--warning',       '#f59e0b'),
  CSS_VAR('--info',          '#0ea5e9'),
  CSS_VAR('--danger',        '#dc2626'),
  CSS_VAR('--text-subtle',   '#94a3b8'),
], []);

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
/* Common Chart.js options                                                    */
/* -------------------------------------------------------------------------- */

const baseOpts: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { boxWidth: 12, boxHeight: 12, font: { size: 11 } },
    },
    tooltip: {
      padding: 10,
      titleFont: { size: 12, weight: 600 },
      bodyFont:  { size: 12 },
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Size prop                                                                  */
/* -------------------------------------------------------------------------- */

export type ChartSize = 'sm' | 'md' | 'lg' | 'xl';
const sizeClass = (size: ChartSize = 'md'): string => cls[`chart--${size}`]!;

/* -------------------------------------------------------------------------- */
/* BarChart                                                                   */
/* -------------------------------------------------------------------------- */

export interface BarChartProps {
  readonly labels: readonly string[];
  /** One dataset: label + data array. Multiple datasets: stacked bars. */
  readonly datasets: readonly { readonly label: string; readonly data: readonly number[] }[];
  readonly horizontal?: boolean;
  readonly size?: ChartSize;
  readonly stacked?: boolean;
  readonly showLegend?: boolean;
}

export const BarChart: FC<BarChartProps> = ({
  labels, datasets, horizontal, size, stacked, showLegend = true,
}) => {
  const palette = usePalette();
  const data = {
    labels: labels as string[],
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data:  ds.data as number[],
      backgroundColor: palette[i % palette.length],
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 40,
    })),
  };
  const options: ChartOptions<'bar'> = {
    ...(baseOpts as ChartOptions<'bar'>),
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      ...baseOpts.plugins,
      legend: { ...(baseOpts.plugins?.legend as object), display: showLegend && datasets.length > 1 },
    },
    scales: {
      x: { stacked, grid: { display: !horizontal }, ticks: { font: { size: 11 } } },
      y: { stacked, grid: { display: horizontal }, ticks: { font: { size: 11 } } },
    },
  };
  return (
    <div className={`${cls.chart} ${sizeClass(size)}`}>
      <Bar data={data} options={options} />
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
  const palette = usePalette();
  const data = {
    labels: labels as string[],
    datasets: datasets.map((ds, i) => {
      const c = palette[i % palette.length]!;
      return {
        label: ds.label,
        data:  ds.data as number[],
        borderColor: c,
        backgroundColor: fill ? `${c}33` : c,
        fill: !!fill,
        tension: 0.25,
        pointRadius: 3,
        borderWidth: 2,
      };
    }),
  };
  const options: ChartOptions<'line'> = {
    ...(baseOpts as ChartOptions<'line'>),
    plugins: {
      ...baseOpts.plugins,
      legend: { ...(baseOpts.plugins?.legend as object), display: datasets.length > 1 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
    },
  };
  return (
    <div className={`${cls.chart} ${sizeClass(size)}`}>
      <Line data={data} options={options} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DoughnutChart                                                              */
/* -------------------------------------------------------------------------- */

export interface DoughnutChartProps {
  readonly labels: readonly string[];
  readonly data: readonly number[];
  readonly size?: ChartSize;
  readonly centerText?: string;
}

export const DoughnutChart: FC<DoughnutChartProps> = ({ labels, data, size = 'md' }) => {
  const palette = usePalette();
  const chartData = {
    labels: labels as string[],
    datasets: [{
      data: data as number[],
      backgroundColor: labels.map((_, i) => palette[i % palette.length]!),
      borderWidth: 2,
      borderColor: CSS_VAR('--surface', '#ffffff'),
    }],
  };
  const options: ChartOptions<'doughnut'> = {
    ...(baseOpts as ChartOptions<'doughnut'>),
    cutout: '65%',
  };
  return (
    <div className={`${cls.chart} ${sizeClass(size)}`}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* KPI card - big number stat tile                                            */
/* -------------------------------------------------------------------------- */

export interface KPIProps {
  readonly label: string;
  readonly value: string;
  /** Percent change vs previous period; positive = up. */
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
    : delta > 0         ? '\u25B2'   // up-triangle
    : delta < 0         ? '\u25BC'
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

/* -------------------------------------------------------------------------- */
/* Layout helpers                                                             */
/* -------------------------------------------------------------------------- */

export const KPIRow: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={cls['kpi-row']}>{children}</div>
);
export const ChartGrid: FC<{ children: ReactNode; cols3?: boolean }> = ({ children, cols3 }) => (
  <div className={`${cls['chart-grid']} ${cols3 ? cls['chart-grid--3col'] : ''}`}>{children}</div>
);
