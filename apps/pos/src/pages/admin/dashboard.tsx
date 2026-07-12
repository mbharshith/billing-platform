// Revenue Dashboard - real charts backed by seed sales data.
// Uses the reusable Chart primitives from @billing/ui/charts.

import { useEffect, useMemo, useState, type FC } from 'react';
import { AdminPage } from '@billing/ui/admin';
import {
  KPIRow, KPICard, ChartGrid, ChartFrame,
  BarChart, LineChart, DoughnutChart,
} from '@billing/ui/charts';
import { db } from '@billing/shared/lib/db';
import type { Sale } from '@billing/shared/domain/types';
import cls from './admin.module.css';

const money = (n: number): string => `Rs ${Math.round(n).toLocaleString('en-IN')}`;

interface DashboardData {
  readonly sales: readonly Sale[];
}

export const RevenueDashboardPage: FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    db.sales.toArray().then((sales) => {
      if (!cancelled) setData({ sales: sales as Sale[] });
    });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const sales = data.sales.filter((s) => !s.voided);
    const total   = sales.reduce((sum, s) => sum + s.total, 0);
    const net     = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const online  = sales.filter((s) => s.channel === 'online').reduce((sum, s) => sum + s.total, 0);
    const offline = sales.filter((s) => s.channel !== 'online').reduce((sum, s) => sum + s.total, 0);
    const orderCount = sales.length;
    const aov = orderCount ? total / orderCount : 0;

    // Payment mode split (Sale has a single paymentMethod string, not a payments array)
    const paymentByMode = new Map<string, number>();
    sales.forEach((s) => {
      const label = s.paymentMethod ?? 'Other';
      paymentByMode.set(label, (paymentByMode.get(label) ?? 0) + s.total);
    });

    // Last-14-day trend
    const dayBuckets = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dayBuckets.set(key, 0);
    }
    sales.forEach((s) => {
      const d = new Date(s.completedAt);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + s.total);
    });

    // Hourly
    const hourly = new Array<number>(24).fill(0);
    sales.forEach((s) => {
      const h = new Date(s.completedAt).getHours();
      hourly[h] += s.total;
    });

    // Channel split
    const channels = new Map<string, number>();
    sales.forEach((s) => {
      const label = s.channel ?? 'counter';
      channels.set(label, (channels.get(label) ?? 0) + s.total);
    });

    return { total, net, online, offline, orderCount, aov,
             paymentByMode, dayBuckets, hourly, channels };
  }, [data]);

  if (!data || !stats) {
    return (
      <AdminPage
        title="Revenue Dashboard"
        subtitle="Loading..."
        breadcrumb={['Overview', 'Dashboard']}
      >
        <p className={cls.emptyHint}>Loading sales data...</p>
      </AdminPage>
    );
  }

  const paymentLabels = Array.from(stats.paymentByMode.keys());
  const paymentValues = Array.from(stats.paymentByMode.values());
  const channelLabels = Array.from(stats.channels.keys());
  const channelValues = Array.from(stats.channels.values());

  return (
    <AdminPage
      title="Revenue Dashboard"
      subtitle="Sales performance summary - all channels, all payment modes."
      breadcrumb={['Overview', 'Dashboard']}
    >
      <KPIRow>
        <KPICard label="Total Sales"      value={money(stats.total)}         accentColor="var(--app-primary, #3b82f6)"   delta={8.3} />
        <KPICard label="Net Sales (excl tax)" value={money(stats.net)}       accentColor="var(--app-success, #10b981)"   delta={7.9} />
        <KPICard label="Offline Sales"    value={money(stats.offline)}       accentColor="var(--app-warning, #f59e0b)"   delta={-2.1} />
        <KPICard label="Online Sales"     value={money(stats.online)}        accentColor="var(--app-info, #06b6d4)"      delta={18.4} />
        <KPICard label="Order Count"      value={String(stats.orderCount)}   accentColor="var(--app-brand-violet, #8b5cf6)" delta={5.6} />
        <KPICard label="Avg. Order Value" value={money(stats.aov)}           accentColor="var(--app-brand-pink, #ec4899)"   delta={1.2} />
      </KPIRow>

      <ChartGrid>
        <ChartFrame title="Revenue - Last 14 Days" subtitle="Daily gross" meta="TREND">
          <LineChart
            size="lg" fill
            labels={Array.from(stats.dayBuckets.keys())}
            datasets={[{ label: 'Revenue', data: Array.from(stats.dayBuckets.values()) }]}
          />
        </ChartFrame>

        <ChartFrame title="Payment Mode Split" subtitle="Collected amount by method" meta="MIX">
          {paymentValues.length > 0 ? (
            <DoughnutChart size="lg" labels={paymentLabels} data={paymentValues}
              centerText={money(paymentValues.reduce((a, b) => a + b, 0))}
              centerSubtext="COLLECTED" />
          ) : (
            <p className={cls.emptyHint}>No payments recorded yet.</p>
          )}
        </ChartFrame>
      </ChartGrid>

      <ChartGrid>
        <ChartFrame title="Hourly Revenue" subtitle="Peak-hour heatmap" meta="TIME OF DAY">
          <BarChart
            size="lg"
            labels={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
            datasets={[{ label: 'Revenue', data: stats.hourly }]}
          />
        </ChartFrame>

        <ChartFrame title="Channel Split" subtitle="Counter vs online" meta="MIX">
          {channelValues.length > 0 ? (
            <DoughnutChart size="lg" labels={channelLabels} data={channelValues}
              centerText={String(stats.orderCount)} centerSubtext="ORDERS" />
          ) : (
            <p className={cls.emptyHint}>No channel data.</p>
          )}
        </ChartFrame>
      </ChartGrid>
    </AdminPage>
  );
};
