// Kitchen Operations - ops dashboard for a restaurant's kitchen.
//
// Aggregates data across active orders, ingredients, recipes, and stations
// into a single operator dashboard:
//
//   - Live queue: count of active online orders + oldest wait time
//   - Station load: card per configured KotStation with active-order counter
//   - Low-stock alerts: ingredients under reorder level
//   - Menu items missing recipes (inventory-blind sales are a smell)
//
// Read-only surface; deep-links to the pages where you'd act on each stat.

import { useMemo, type FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminPage } from '@billing/ui/admin';
import { Badge, Button, Text } from '@billing/ui/atoms';
import { useSales } from '@billing/shared/store/SalesContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useTable } from '@billing/shared/hooks/useTable';
import {
  ACTIVE_ORDER_STATUSES,
} from '@billing/shared/domain/types';
import type {
  KotStation, Ingredient, Recipe,
} from '@billing/shared/domain/restaurant';
import cls from './admin.module.css';

const minutesSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

export const OperationsPage: FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { sales } = useSales();
  const { products } = useProducts();
  const stations    = useTable<KotStation>('kotStations');
  const ingredients = useTable<Ingredient>('ingredients');
  const recipes     = useTable<Recipe>('recipes');

  const active = useMemo(
    () => sales.filter((s) =>
      s.channel === 'online'
      && s.orderStatus
      && ACTIVE_ORDER_STATUSES.includes(s.orderStatus)),
    [sales],
  );

  const oldestWait = useMemo(
    () => (active.length === 0 ? 0
      : Math.max(...active.map((s) => minutesSince(s.completedAt)))),
    [active],
  );

  const lowStock = useMemo(
    () => ingredients.rows.filter((i) => i.active !== false && i.currentStock <= i.reorderLevel),
    [ingredients.rows],
  );

  const recipesByProduct = useMemo(
    () => new Set(recipes.rows.map((r) => r.menuItemId)),
    [recipes.rows],
  );
  const missingRecipes = useMemo(
    () => products.filter((p) => p.active !== false && !recipesByProduct.has(p.id)),
    [products, recipesByProduct],
  );

  // NOTE: without a KOT model we can't attribute orders to specific stations,
  // so station load = active order count (same for every station). This is a
  // documented limitation - full attribution ships with the KOT-per-order layer.
  const stationsActive = useMemo(
    () => stations.rows.filter((s) => s.active !== false),
    [stations.rows],
  );

  return (
    <AdminPage
      title="Kitchen Operations"
      subtitle="At-a-glance view of what's happening in the kitchen right now."
    >
      <div className={cls.opsKpis}>
        <KpiCard
          label="Active orders"
          value={active.length}
          tone={active.length > 0 ? 'primary' : 'neutral'}
          hint={active.length > 0 ? `Oldest waiting ${oldestWait}m` : 'Kitchen clear'}
          linkTo={`/${slug}/admin/live-orders`}
          linkLabel="Open Live Orders"
        />
        <KpiCard
          label="Kitchen stations"
          value={stationsActive.length}
          tone="neutral"
          hint={stationsActive.length === 0 ? 'None configured yet' : 'All active'}
          linkTo={`/${slug}/admin/kot-stations`}
          linkLabel="Manage stations"
        />
        <KpiCard
          label="Low-stock ingredients"
          value={lowStock.length}
          tone={lowStock.length > 0 ? 'danger' : 'success'}
          hint={lowStock.length > 0 ? 'Need reorder' : 'All above reorder level'}
          linkTo={`/${slug}/admin/ingredients`}
          linkLabel="Open Ingredients"
        />
        <KpiCard
          label="Menu items without recipe"
          value={missingRecipes.length}
          tone={missingRecipes.length > 0 ? 'accent' : 'success'}
          hint={missingRecipes.length > 0 ? 'Inventory won\u2019t deduct' : 'All covered'}
          linkTo={`/${slug}/admin/recipes`}
          linkLabel="Open Recipes"
        />
      </div>

      {/* Station load list ------------------------------------------------- */}
      {stationsActive.length > 0 && (
        <section className={cls.opsSection}>
          <Text as="h3" size="lg" weight="semibold">Station load</Text>
          <Text tone="subtle" size="sm">
            Per-order station attribution ships with the KOT model; for now this shows
            active-order counts uniformly.
          </Text>
          <div className={cls.opsStationGrid}>
            {stationsActive.map((s) => (
              <div key={s.id} className={cls.opsStation}>
                <div className={cls.opsStation__name}>{s.name}</div>
                <div className={cls.opsStation__printer}>Printer: {s.printer || '-'}</div>
                <Badge variant={active.length > 0 ? 'primary' : 'neutral'}>{active.length} active</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Low stock list --------------------------------------------------- */}
      {lowStock.length > 0 && (
        <section className={cls.opsSection}>
          <Text as="h3" size="lg" weight="semibold">Low stock now</Text>
          <ul className={cls.opsList}>
            {lowStock.slice(0, 10).map((i) => (
              <li key={i.id}>
                <strong>{i.name}</strong> - {i.currentStock}{i.unit} left
                <em> (reorder at {i.reorderLevel}{i.unit})</em>
              </li>
            ))}
            {lowStock.length > 10 && <li><em>...and {lowStock.length - 10} more</em></li>}
          </ul>
        </section>
      )}

      {/* Missing recipes list --------------------------------------------- */}
      {missingRecipes.length > 0 && (
        <section className={cls.opsSection}>
          <Text as="h3" size="lg" weight="semibold">Menu items without a recipe</Text>
          <Text tone="subtle" size="sm">
            These items won\u2019t deduct ingredient stock when sold. Add recipes to
            wire up inventory tracking.
          </Text>
          <ul className={cls.opsList}>
            {missingRecipes.slice(0, 10).map((p) => (
              <li key={p.id}><strong>{p.name}</strong></li>
            ))}
            {missingRecipes.length > 10 && <li><em>...and {missingRecipes.length - 10} more</em></li>}
          </ul>
        </section>
      )}
    </AdminPage>
  );
};


interface KpiCardProps {
  readonly label: string;
  readonly value: number;
  readonly tone: 'primary' | 'success' | 'danger' | 'accent' | 'neutral';
  readonly hint: string;
  readonly linkTo: string;
  readonly linkLabel: string;
}

const KpiCard: FC<KpiCardProps> = ({ label, value, tone, hint, linkTo, linkLabel }) => (
  <div className={cls.kpiCard}>
    <div className={cls.kpiCard__label}>{label}</div>
    <div className={cls.kpiCard__value}>{value}</div>
    <Badge variant={tone}>{hint}</Badge>
    <Link to={linkTo} style={{ textDecoration: 'none' }}>
      <Button variant="ghost" size="sm">{linkLabel}</Button>
    </Link>
  </div>
);
