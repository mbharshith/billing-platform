/**
 * DashboardPage — KPIs + recent sales + top products + inventory.
 * Reads from SalesContext + ProductsContext; ignores voided sales in KPIs.
 */
import { useMemo, type FC } from 'react';
import pages from './pages.module.css';
import {
  DashboardKpis, InventoryTable, RecentSalesTable, TopProductsTable,
  type ProductAggregate,
} from '../components/organisms';
import { PageHeader } from '../components/layout/AppShell';
import { STRINGS } from '../domain/strings';
import { useProducts } from '../store/ProductsContext';
import { useSales } from '../store/SalesContext';

export const DashboardPage: FC = () => {
  const { sales } = useSales();
  const { products } = useProducts();

  // Only non-voided sales contribute to revenue / units / top products.
  const liveSales = useMemo(() => sales.filter((s) => !s.voided), [sales]);

  const aggregates = useMemo<readonly ProductAggregate[]>(() => {
    const map = new Map<string, ProductAggregate>();
    for (const product of products) {
      map.set(product.id, {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        tone: product.tone,
        category: product.category,
        stock: product.stock,
        unitsSold: 0,
        revenue: 0,
      });
    }
    for (const sale of liveSales) {
      for (const line of sale.lines) {
        const agg = map.get(line.productId);
        if (!agg) continue;
        map.set(line.productId, {
          ...agg,
          unitsSold: agg.unitsSold + line.quantity,
          revenue: agg.revenue + line.lineTotal,
        });
      }
    }
    return Array.from(map.values());
  }, [liveSales, products]);

  const kpis = useMemo(() => {
    const revenue = liveSales.reduce((s, sale) => s + sale.total, 0);
    const unitsSold = liveSales.reduce((s, sale) => s + sale.unitCount, 0);
    const uniqueSkus = aggregates.filter((a) => a.unitsSold > 0).length;
    const lendingBalance = liveSales
      .filter((s) => s.paymentMethod === 'lending')
      .reduce((s, sale) => s + sale.total, 0);
    return { revenue, saleCount: liveSales.length, unitsSold, uniqueSkus, lendingBalance };
  }, [liveSales, aggregates]);

  return (
    <>
      <PageHeader title={STRINGS.dashboard.pageTitle} subtitle={STRINGS.dashboard.pageSubtitle} />

      <DashboardKpis {...kpis} />

      <div className={pages.dashboardLayout}>
        <RecentSalesTable sales={sales} />
        <TopProductsTable aggregates={aggregates} />
      </div>

      <InventoryTable aggregates={aggregates} />
    </>
  );
};
