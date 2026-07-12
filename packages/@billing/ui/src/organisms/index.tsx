// Organisms - self-contained page-region compositions (header, product grid, cart, etc.).
// May read React Context directly. Pages compose organisms; never reach past them to atoms.
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import cls from './organisms.module.css';
import { Badge, Button, Icon, IconButton, Spinner, Text } from '../atoms';
import {
  CartLineItem, CategoryFilter, EmptyState, MobileNumberField,
  PaymentBadge, PaymentMethodOption, ProductBadge, ProductCard, SearchBar, StatCard,
} from '../molecules';
import { STRINGS } from '@billing/shared/domain/strings';
import { fmtDateTime, fmtTime, num, formatNumberCompact, digitsOnly, nextInvoiceNo } from '@billing/shared/domain/format';
import { useMoney } from '@billing/shared/hooks/useMoney';
import type { PaymentMethod, Product, Sale, SaleLine } from '@billing/shared/domain/types';
import { TAX_RATE } from '@billing/shared/domain/catalog';

/* -------------------------------------------------------------------------- */
/* AppHeader                                                                  */
/* -------------------------------------------------------------------------- */
type NavRoute = 'cashier' | 'dashboard';

interface AppHeaderProps {
  route: NavRoute;
  onNavigate: (route: NavRoute) => void;
}

export const AppHeader: FC<AppHeaderProps> = ({ route, onNavigate }) => (
  <header className={cls.header} role="banner">
    <div className={cls.header__inner}>
      <div className={cls.brand}>
        <span className={cls.brand__mark} aria-hidden="true">
          <Icon name="spark" size={22} />
        </span>
        <div className={cls.brand__text}>
          <Text as="span" size="lg" weight="heavy" tone="inverse">{STRINGS.brand.name}</Text>
          <Text as="span" size="xs" weight="semibold" tone="inverse" upper>{STRINGS.brand.productLabel}</Text>
        </div>
      </div>

      <nav className={cls.nav} aria-label={STRINGS.ariaLabels.navigate}>
        <button
          type="button"
          className={[cls.navLink, route === 'cashier' && cls['navLink--active']]
            .filter(Boolean).join(' ')}
          aria-current={route === 'cashier' ? 'page' : undefined}
          onClick={() => onNavigate('cashier')}
        >
          <Icon name="store" size={16} /> {STRINGS.nav.cashier}
        </button>
        <button
          type="button"
          className={[cls.navLink, route === 'dashboard' && cls['navLink--active']]
            .filter(Boolean).join(' ')}
          aria-current={route === 'dashboard' ? 'page' : undefined}
          onClick={() => onNavigate('dashboard')}
        >
          <Icon name="chart" size={16} /> {STRINGS.nav.dashboard}
        </button>
      </nav>

      <div className={cls.register}>
        <span className={cls.register__dot} aria-hidden="true" />
        <Text size="xs" weight="semibold" tone="inverse" upper>{STRINGS.nav.register}</Text>
      </div>
    </div>
  </header>
);

/* -------------------------------------------------------------------------- */
/* ProductGrid                                                                */
/* -------------------------------------------------------------------------- */
interface ProductGridProps {
  products: readonly Product[];
  cart: Readonly<Record<string, number>>;
  flashId: string | null;
  onAdd: (productId: string) => void;
}

export const ProductGrid: FC<ProductGridProps> = ({ products, cart, flashId, onAdd }) => {
  if (products.length === 0) {
    return (
      <EmptyState
        icon="search"
        title={STRINGS.cashier.emptyResults}
        hint={STRINGS.cashier.emptyResultsHint}
      />
    );
  }
  return (
    <div className={cls.productGrid}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          quantityInCart={cart[p.id] ?? 0}
          flashing={flashId === p.id}
          onAdd={() => onAdd(p.id)}
        />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* ProductToolbar (search + filters)                                          */
/* -------------------------------------------------------------------------- */
interface ProductToolbarProps<T extends string> {
  query: string;
  onQueryChange: (value: string) => void;
  categories: readonly T[];
  category: T;
  onCategoryChange: (cat: T) => void;
}

export const ProductToolbar = <T extends string>({
  query, onQueryChange, categories, category, onCategoryChange,
}: ProductToolbarProps<T>) => (
  <div className={cls.productToolbar}>
    <SearchBar
      value={query}
      onChange={onQueryChange}
      placeholder={STRINGS.cashier.searchPlaceholder}
      clearLabel={STRINGS.cashier.clearSearch}
    />
    <CategoryFilter categories={categories} active={category} onSelect={onCategoryChange} />
  </div>
);

/* -------------------------------------------------------------------------- */
/* CartPanel                                                                  */
/* -------------------------------------------------------------------------- */
interface CartPanelProps {
  lines: readonly SaleLine[];
  subtotal: number;
  tax: number;
  total: number;
  unitCount: number;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCharge: () => void;
  // When set, panel drops sticky positioning + shows a close button (mobile sheet).
  onClose?: () => void;
  variant?: 'inline' | 'sheet';
  // Optional: chip-row (Discount / Coupon / Charges) rendered ABOVE totals.
  moneyActions?: ReactNode;
  // Optional: extra breakdown rows (line-discount / bill-discount / coupon / charges)
  // rendered inside the totals block, before the divider.
  extraTotalsRows?: ReactNode;
}

export const CartPanel: FC<CartPanelProps> = ({
  lines, subtotal, tax, total, unitCount,
  onIncrement, onDecrement, onRemove, onClear, onCharge, onClose, variant = 'inline',
  moneyActions, extraTotalsRows,
}) => {
  const { money } = useMoney();
  return (
  <aside
    className={[cls.cartPanel, variant === 'sheet' && cls['cartPanel--inModal']].filter(Boolean).join(' ')}
    aria-label={STRINGS.cashier.cartTitle}
  >
    <div className={cls.cartPanel__header}>
      <div className={cls.cartPanel__title}>
        <Icon name="cart" size={18} />
        <Text weight="bold">{STRINGS.cashier.cartTitle}</Text>
      </div>
      <div className={cls.cartHeaderMeta}>
        <Badge variant="accent">
          {unitCount} {unitCount === 1 ? STRINGS.cashier.itemSuffix : STRINGS.cashier.itemsSuffix}
        </Badge>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className={cls.cartCloseBtn}
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </div>

    <div className={cls.cartPanel__scroll}>
      {lines.length === 0 ? (
        <EmptyState
          icon="bag"
          title={STRINGS.cashier.cartEmpty}
          hint={STRINGS.cashier.cartEmptyHint}
        />
      ) : (
        <div className={cls.cartPanel__lines}>
          {lines.map((line) => (
            <CartLineItem
              key={line.productId}
              line={line}
              onIncrement={() => onIncrement(line.productId)}
              onDecrement={() => onDecrement(line.productId)}
              onRemove={() => onRemove(line.productId)}
            />
          ))}
        </div>
      )}
    </div>

    {lines.length > 0 && (
      <div className={cls.cartPanel__totals}>
        {moneyActions && <div className={cls.cartPanel__moneyActions}>{moneyActions}</div>}
        <div className={cls.cartPanel__totalsRow}>
          <Text size="sm" tone="subtle">{STRINGS.cashier.subtotal}</Text>
          <Text weight="semibold">{money(subtotal)}</Text>
        </div>
        {extraTotalsRows}
        <div className={cls.cartPanel__totalsRow}>
          <Text size="sm" tone="subtle">
            {STRINGS.cashier.tax} ({(TAX_RATE * 100).toFixed(2)}%)
          </Text>
          <Text weight="semibold">{money(tax)}</Text>
        </div>
        <hr className={cls.cartPanel__totalsDivider} />
        <div className={cls.cartPanel__totalsRow}>
          <Text size="lg" weight="heavy">{STRINGS.cashier.total}</Text>
          <Text size="lg" weight="heavy" tone="primary">{money(total)}</Text>
        </div>
        <div className={cls.cartPanel__actions}>
          <Button variant="danger" leadingIcon="trash" onClick={onClear}>
            {STRINGS.cashier.clearCart}
          </Button>
          <Button
            variant="primary"
            trailingIcon="arrow"
            onClick={onCharge}
          >
            {STRINGS.cashier.charge} · {money(total)}
          </Button>
        </div>
      </div>
    )}
  </aside>
  );
};

/* -------------------------------------------------------------------------- */
/* MobileCartBar — sticky bottom bar shown < 1024px when cart has items      */
/* -------------------------------------------------------------------------- */
interface MobileCartBarProps {
  unitCount: number;
  total: number;
  onOpen: () => void;
}

export const MobileCartBar: FC<MobileCartBarProps> = ({ unitCount, total, onOpen }) => {
  const { money } = useMoney();
  if (unitCount === 0) return null;
  return (
    <button
      type="button"
      className={cls.mobileCartBar}
      onClick={onOpen}
      aria-label={`Open cart with ${unitCount} items, total ${money(total)}`}
    >
      <span className={cls.mobileCartBar__badge}>
        <Icon name="cart" size={20} />
        <span className={cls.mobileCartBar__count}>{unitCount}</span>
      </span>
      <span className={cls.mobileCartBar__summary}>
        <span className={cls.mobileCartBar__label}>{unitCount} {unitCount === 1 ? 'item' : 'items'}</span>
        <span className={cls.mobileCartBar__total}>{money(total)}</span>
      </span>
      <span className={cls.mobileCartBar__cta}>
        View cart <Icon name="arrow" size={16} />
      </span>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Generic Modal (with focus trap + Esc-to-close)                             */
/* -------------------------------------------------------------------------- */
interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
}

export const Modal: FC<ModalProps> = ({ title, subtitle, onClose, wide, children, footer, closeLabel }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className={cls.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={[cls.modal, wide && cls['modal--wide']].filter(Boolean).join(' ')}>
        <div className={cls.modal__header}>
          <div className={cls.modal__headerBody}>
            <Text as="h2" size="xl" weight="bold" className="modal-title">{title}</Text>
            {subtitle && <Text size="sm" tone="subtle">{subtitle}</Text>}
          </div>
          <IconButton icon="close" a11yLabel={closeLabel} onClick={onClose} />
        </div>
        <div className={cls.modal__body}>{children}</div>
        {footer && <div className={cls.modal__footer}>{footer}</div>}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* PaymentModal — captures method + (mobile if lending)                       */
/* -------------------------------------------------------------------------- */
interface PaymentModalProps {
  total: number;
  unitCount: number;
  onCancel: () => void;
  onConfirm: (method: PaymentMethod, mobile: string | null) => void;
}

export const PaymentModal: FC<PaymentModalProps> = ({ total, unitCount, onCancel, onConfirm }) => {
  const { money } = useMoney();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const needsMobile = method === 'lending';

  const handleSubmit = () => {
    if (needsMobile && digitsOnly(mobile).length !== 10) {
      setError(STRINGS.payment.mobileError);
      return;
    }
    setSubmitting(true);
    // Simulate a brief network round-trip so the UX shows the loading state.
    window.setTimeout(() => {
      onConfirm(method, needsMobile ? digitsOnly(mobile) : null);
    }, 350);
  };

  return (
    <Modal
      title={STRINGS.payment.heading}
      subtitle={STRINGS.payment.subheading}
      onClose={submitting ? () => {} : onCancel}
      closeLabel={STRINGS.ariaLabels.closePayment}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            {STRINGS.payment.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            trailingIcon={submitting ? undefined : 'check'}
          >
            {submitting ? STRINGS.payment.submitting : STRINGS.payment.submit}
          </Button>
        </>
      }
    >
      <div className={cls.paymentSummary}>
        <div>
          <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.cashier.total}</Text>
          <Text size="2xl" weight="heavy" tone="primary">{money(total)}</Text>
        </div>
        <Badge variant="primary">
          {unitCount} {unitCount === 1 ? STRINGS.cashier.itemSuffix : STRINGS.cashier.itemsSuffix}
        </Badge>
      </div>

      <div className={cls.paymentMethods} role="radiogroup" aria-label={STRINGS.payment.heading}>
        <PaymentMethodOption
          method="cash"    icon="cash"  label={STRINGS.payment.methodCash}
          hint={STRINGS.payment.methodCashHint}
          selected={method === 'cash'}    onSelect={() => setMethod('cash')}
        />
        <PaymentMethodOption
          method="card"    icon="card"  label={STRINGS.payment.methodCard}
          hint={STRINGS.payment.methodCardHint}
          selected={method === 'card'}    onSelect={() => setMethod('card')}
        />
        <PaymentMethodOption
          method="lending" icon="coins" label={STRINGS.payment.methodLending}
          hint={STRINGS.payment.methodLendingHint}
          selected={method === 'lending'} onSelect={() => setMethod('lending')}
        />
      </div>

      {needsMobile && (
        <div className={cls.paymentMobileWrap}>
          <MobileNumberField
            id="lending-mobile"
            value={mobile}
            onChange={(v) => { setMobile(v); setError(undefined); }}
            error={error}
            required
          />
        </div>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* ReceiptModal                                                               */
/* -------------------------------------------------------------------------- */
interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { money } = useMoney();
  return (
  <Modal
    title={STRINGS.receipt.successHeading}
    subtitle={STRINGS.receipt.successBody}
    onClose={onClose}
    closeLabel={STRINGS.ariaLabels.closeReceipt}
    wide
    footer={
      <>
        <Button variant="secondary" leadingIcon="print" onClick={() => window.print()}>
          {STRINGS.receipt.print}
        </Button>
        <Button variant="primary" trailingIcon="arrow" onClick={onClose}>
          {STRINGS.receipt.newSale}
        </Button>
      </>
    }
  >
    <div className={cls.receipt}>
      <div className={cls.receipt__successIcon} aria-hidden="true">
        <Icon name="check" size={32} />
      </div>
      <div className={cls.receipt__meta}>
        <div className={cls.receipt__metaCell}>
          <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.invoice}</Text>
          <Text weight="semibold">{sale.invoiceNo}</Text>
        </div>
        <div className={cls.receipt__metaCell}>
          <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.dateLabel}</Text>
          <Text weight="semibold">{fmtDateTime(sale.completedAt)}</Text>
        </div>
        <div className={cls.receipt__metaCell}>
          <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.payment}</Text>
          <PaymentBadge method={sale.paymentMethod} />
        </div>
        {sale.customerMobile && (
          <div className={cls.receipt__metaCell}>
            <Text size="xs" tone="subtle" weight="semibold" upper>{STRINGS.receipt.customer}</Text>
            <Text weight="semibold">{sale.customerMobile}</Text>
          </div>
        )}
      </div>

      <div>
        <Text size="xs" tone="subtle" weight="bold" upper>{STRINGS.receipt.itemsSold}</Text>
        <div className={cls.receipt__lines}>
          {sale.lines.map((line) => (
            <div key={line.productId} className={cls.receipt__line}>
              <ProductBadge name={line.name} tone={line.tone} size="sm" />
              <div className={cls.receipt__lineBody}>
                <Text weight="semibold" size="sm" truncate>{line.name}</Text>
                <Text size="xs" tone="subtle">{line.quantity} × {money(line.unitPrice)}</Text>
              </div>
              <Text weight="bold">{money(line.lineTotal)}</Text>
            </div>
          ))}
        </div>
      </div>

      <div className={cls.receipt__totals}>
        <div className={cls.receipt__totalsRow}>
          <Text size="sm" tone="subtle">{STRINGS.cashier.subtotal}</Text>
          <Text weight="semibold">{money(sale.subtotal)}</Text>
        </div>
        <div className={cls.receipt__totalsRow}>
          <Text size="sm" tone="subtle">{STRINGS.cashier.tax}</Text>
          <Text weight="semibold">{money(sale.tax)}</Text>
        </div>
        <div className={cls.receipt__totalsRow}>
          <Text size="lg" weight="heavy">{STRINGS.receipt.amountPaid}</Text>
          <Text size="lg" weight="heavy" tone="primary">{money(sale.total)}</Text>
        </div>
      </div>

      <Text size="xs" tone="subtle" center>
        {STRINGS.receipt.thankYou} {STRINGS.receipt.returnPolicy}
      </Text>
    </div>
  </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Dashboard: RecentSalesTable                                                */
/* -------------------------------------------------------------------------- */
interface RecentSalesTableProps { sales: readonly Sale[] }

export const RecentSalesTable: FC<RecentSalesTableProps> = ({ sales }) => {
  const { money } = useMoney();
  return (
  <div className={cls.tableCard}>
    <div className={cls.tableCard__header}>
      <Text as="h2" size="lg" weight="bold">{STRINGS.dashboard.recentSalesTitle}</Text>
      <Badge variant="neutral">{sales.length}</Badge>
    </div>
    {sales.length === 0 ? (
      <EmptyState icon="receipt" title={STRINGS.dashboard.recentSalesEmpty} />
    ) : (
      <div className={cls.tableWrap}>
        <table className={cls.dataTable}>
          <thead>
            <tr>
              <th>{STRINGS.dashboard.columnInvoice}</th>
              <th>{STRINGS.dashboard.columnTime}</th>
              <th className="numeric">{STRINGS.dashboard.columnItems}</th>
              <th>{STRINGS.dashboard.columnPayment}</th>
              <th>{STRINGS.dashboard.columnCustomer}</th>
              <th className="numeric">{STRINGS.dashboard.columnTotal}</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 15).map((s) => (
              <tr key={s.id}>
                <td><Text weight="semibold" size="sm">{s.invoiceNo}</Text></td>
                <td><Text size="sm" tone="subtle">{fmtTime(s.completedAt)}</Text></td>
                <td className="numeric"><Text size="sm">{s.unitCount}</Text></td>
                <td><PaymentBadge method={s.paymentMethod} /></td>
                <td>
                  <Text size="sm" tone={s.customerMobile ? 'default' : 'muted'}>
                    {s.customerMobile ?? 'Walk-in'}
                  </Text>
                </td>
                <td className="numeric"><Text weight="bold" size="sm">{money(s.total)}</Text></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Dashboard: TopProductsTable                                                */
/* -------------------------------------------------------------------------- */
export interface ProductAggregate {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly tone: SaleLine['tone'];
  readonly category: Product['category'];
  readonly stock: number;
  readonly unitsSold: number;
  readonly revenue: number;
}

interface TopProductsTableProps { aggregates: readonly ProductAggregate[] }

const rankClass = (idx: number): string | undefined => {
  if (idx === 0) return cls['rankBadge--gold'];
  if (idx === 1) return cls['rankBadge--silver'];
  if (idx === 2) return cls['rankBadge--bronze'];
  return undefined;
};

export const TopProductsTable: FC<TopProductsTableProps> = ({ aggregates }) => {
  const { money } = useMoney();
  const top = useMemo(
    () => [...aggregates].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10),
    [aggregates],
  );
  return (
    <div className={cls.tableCard}>
      <div className={cls.tableCard__header}>
        <Text as="h2" size="lg" weight="bold">{STRINGS.dashboard.topProductsTitle}</Text>
      </div>
      {top.length === 0 || top.every((a) => a.unitsSold === 0) ? (
        <EmptyState icon="chart" title={STRINGS.dashboard.topProductsEmpty} />
      ) : (
        <div className={cls.tableWrap}>
          <table className={cls.dataTable}>
            <thead>
              <tr>
                <th className={cls.thRankCell}>{STRINGS.dashboard.columnRank}</th>
                <th>{STRINGS.dashboard.columnProduct}</th>
                <th className="numeric">{STRINGS.dashboard.columnSold}</th>
                <th className="numeric">{STRINGS.dashboard.columnRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {top.map((a, idx) => (
                <tr key={a.productId}>
                  <td>
                    <span className={[cls.rankBadge, rankClass(idx)].filter(Boolean).join(' ')}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>
                    <div className={cls.productCell}>
                      <ProductBadge name={a.name} tone={a.tone} size="sm" />
                      <div className={cls.productCell__body}>
                        <Text as="div" weight="semibold" size="sm">{a.name}</Text>
                        <Text as="div" size="xs" tone="subtle">{a.sku}</Text>
                      </div>
                    </div>
                  </td>
                  <td className="numeric"><Text weight="bold" size="sm">{num(a.unitsSold)}</Text></td>
                  <td className="numeric"><Text weight="bold" size="sm">{money(a.revenue)}</Text></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Dashboard: InventoryTable                                                  */
/* -------------------------------------------------------------------------- */
interface InventoryTableProps { aggregates: readonly ProductAggregate[] }

const stockClass = (pct: number): string | undefined => {
  if (pct <= 15) return cls['stockBar__fill--critical'];
  if (pct <= 35) return cls['stockBar__fill--low'];
  return undefined;
};

export const InventoryTable: FC<InventoryTableProps> = ({ aggregates }) => {
  const withMovement = useMemo(
    () => [...aggregates].sort((a, b) => b.unitsSold - a.unitsSold),
    [aggregates],
  );
  return (
    <div className={cls.tableCard}>
      <div className={cls.tableCard__header}>
        <Text as="h2" size="lg" weight="bold">{STRINGS.dashboard.inventoryTitle}</Text>
      </div>
      {withMovement.length === 0 ? (
        <EmptyState icon="chart" title={STRINGS.dashboard.inventoryEmpty} />
      ) : (
        <div className={cls.tableWrap}>
          <table className={cls.dataTable}>
            <thead>
              <tr>
                <th>{STRINGS.dashboard.columnSku}</th>
                <th>{STRINGS.dashboard.columnProduct}</th>
                <th>{STRINGS.dashboard.columnCategory}</th>
                <th className="numeric">{STRINGS.dashboard.columnMovement}</th>
                <th className={cls.thStockCell}>{STRINGS.dashboard.columnStock}</th>
              </tr>
            </thead>
            <tbody>
              {withMovement.map((a) => {
                const remaining = Math.max(a.stock - a.unitsSold, 0);
                const pct = a.stock === 0 ? 0 : Math.round((remaining / a.stock) * 100);
                return (
                  <tr key={a.productId}>
                    <td><Text size="sm" weight="semibold">{a.sku}</Text></td>
                    <td>
                      <div className={cls.productCell}>
                        <ProductBadge name={a.name} tone={a.tone} size="sm" />
                        <Text weight="semibold" size="sm">{a.name}</Text>
                      </div>
                    </td>
                    <td><Text size="sm" tone="subtle">{a.category}</Text></td>
                    <td className="numeric">
                      {a.unitsSold > 0
                        ? <Badge variant="success">−{a.unitsSold}</Badge>
                        : <Text size="sm" tone="muted">—</Text>}
                    </td>
                    <td>
                      <div className={cls.dashRowInner}>
                        <div
                          className={cls.stockBar}
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`Stock remaining ${pct}%`}
                        >
                          <span
                            className={[cls.stockBar__fill, stockClass(pct)].filter(Boolean).join(' ')}
                            style={{ ['--fill' as string]: `${pct}%` }}
                          />
                        </div>
                        <Text size="xs" tone="subtle">{remaining}/{a.stock}</Text>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Dashboard: KPI grid                                                        */
/* -------------------------------------------------------------------------- */
interface DashboardKpisProps {
  revenue: number;
  saleCount: number;
  unitsSold: number;
  uniqueSkus: number;
  lendingBalance: number;
}

export const DashboardKpis: FC<DashboardKpisProps> = ({
  revenue, saleCount, unitsSold, uniqueSkus, lendingBalance,
}) => {
  const { money, moneyCompact } = useMoney();
  return (
  <div className={cls.dashKpiGrid}>
    <StatCard label={STRINGS.dashboard.kpiRevenue}
              value={moneyCompact(revenue)}       fullValue={money(revenue)}
              icon="coins" tone="success" />
    <StatCard label={STRINGS.dashboard.kpiSales}
              value={formatNumberCompact(saleCount)} fullValue={num(saleCount)}
              icon="receipt" />
    <StatCard label={STRINGS.dashboard.kpiUnits}
              value={formatNumberCompact(unitsSold)} fullValue={num(unitsSold)}
              icon="bag" tone="accent" />
    <StatCard label={STRINGS.dashboard.kpiUniqueSku}
              value={formatNumberCompact(uniqueSkus)} fullValue={num(uniqueSkus)}
              icon="chart" />
    <StatCard label={STRINGS.dashboard.kpiLendingWO}
              value={moneyCompact(lendingBalance)} fullValue={money(lendingBalance)}
              icon="phone" tone="danger" hint="Buy-now-pay-later outstanding" />
  </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Helper: build a fresh Sale value                                           */
/* -------------------------------------------------------------------------- */
export interface BuildSaleInput {
  readonly lines: readonly SaleLine[];
  readonly subtotal: number;
  readonly tax: number;
  readonly total?: number;               // pass explicit total when it != subtotal + tax
  readonly paymentMethod: PaymentMethod;
  readonly customerMobile: string | null;
  readonly customerId: string | null;
  readonly cashierId: string;
  readonly cashierName: string;
  readonly storeId: string;

  /* -- Optional cashier extensions - passed through when present ---------- */
  readonly orderTypeCode?: string;
  readonly tableId?: string;
  readonly tableCode?: string;
  readonly customerName?: string | null;
  readonly billDiscount?: import('@billing/shared/domain/types').SaleBillDiscount;
  readonly coupon?: import('@billing/shared/domain/types').SaleCoupon;
  readonly lineDiscountTotal?: number;
  readonly charges?: readonly import('@billing/shared/domain/types').SaleCharge[];
  readonly payments?: readonly import('@billing/shared/domain/types').SalePayment[];
  readonly heldAt?: string | null;
  readonly note?: string;
}

export const buildSale = (input: BuildSaleInput): Sale => ({
  id: crypto.randomUUID(),
  invoiceNo: nextInvoiceNo(),
  completedAt: new Date().toISOString(),
  lines: input.lines,
  subtotal: input.subtotal,
  tax: input.tax,
  total: input.total ?? input.subtotal + input.tax,
  unitCount: input.lines.reduce((s, l) => s + l.quantity, 0),
  paymentMethod: input.paymentMethod,
  customerMobile: input.customerMobile,
  customerId: input.customerId,
  cashierId: input.cashierId,
  cashierName: input.cashierName,
  voided: false,
  voidedAt: null,
  voidedReason: null,
  storeId: input.storeId,
  channel: 'counter',
  orderStatus: null,
  customerName: input.customerName ?? null,
  deliveryAddress: null,
  customerNotes: null,
  statusHistory: null,
  // Cashier extensions - only set when caller provided them.
  ...(input.orderTypeCode     ? { orderTypeCode:     input.orderTypeCode }     : {}),
  ...(input.tableId           ? { tableId:           input.tableId }           : {}),
  ...(input.tableCode         ? { tableCode:         input.tableCode }         : {}),
  ...(input.billDiscount      ? { billDiscount:      input.billDiscount }      : {}),
  ...(input.coupon            ? { coupon:            input.coupon }            : {}),
  ...(input.lineDiscountTotal !== undefined ? { lineDiscountTotal: input.lineDiscountTotal } : {}),
  ...(input.charges           ? { charges:           input.charges }           : {}),
  ...(input.payments          ? { payments:          input.payments }          : {}),
  ...(input.heldAt !== undefined ? { heldAt: input.heldAt } : {}),
  ...(input.note              ? { note:              input.note }              : {}),
});

// Re-export spinner for pages that need it
export { Spinner };

/* -------------------------------------------------------------------------- */
/* Cashier organisms - order type, table picker, customer picker, discount,   */
/* coupon, charges, split-payment, modifiers, held orders, KOT.                */
/* Split across 3 files to keep each under 400 lines. All share cashier.module.css. */
/* -------------------------------------------------------------------------- */

export {
  OrderTypeToggle, TablePickerModal, CustomerPickerModal,
} from './cashier-context';
export type {
  OrderTypeToggleProps, TablePickerModalProps, CustomerPickerModalProps,
} from './cashier-context';

export {
  BillDiscountModal, CouponInput, ChargesPickerModal,
  SplitPaymentModal, LineDiscountModal,
} from './cashier-money';
export type {
  BillDiscountModalProps, CouponInputProps, ChargesPickerModalProps,
  SplitPaymentModalProps, LineDiscountModalProps,
} from './cashier-money';

export {
  ModifierPickerModal, HeldOrdersDrawer, KotPreviewModal,
} from './cashier-depth';
export type {
  ModifierPickerModalProps, HeldOrdersDrawerProps, KotPreviewModalProps,
} from './cashier-depth';
