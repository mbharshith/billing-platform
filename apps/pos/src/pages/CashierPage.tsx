// CashierPage - the ring-up terminal, now integrated with everything from
// Phases 8-11. Reads OrderType / Table / Discount / Coupon / Charges /
// Modifier / Variant catalogs via useTable(); Composes the order via
// cashier organisms; Writes an enriched Sale via SalesContext.recordSale.
//
// Feature list (all wired in this file):
//   - Order type toggle (Dine-in / Takeaway / Delivery / etc.)
//   - Table picker (auto-required for Dine-in)
//   - Customer picker (walk-in / registered / add-new + loyalty)
//   - Menu categories from DB (no more hardcoded CATEGORY_FILTERS)
//   - Modifier picker on product tap (variant + add-ons + qty + note)
//   - Bill-level discount from catalog + ad-hoc
//   - Coupon code apply / clear
//   - Additional charges (packaging / service / delivery) auto-filtered by order type
//   - Split payment with multiple tenders
//   - Hold order + Recall drawer
//   - KOT print preview after payment
//   - Bill receipt (existing ReceiptModal)

import { useMemo, useState, type FC } from 'react';
import pages from './pages.module.css';
import {
  CartPanel, MobileCartBar, ProductGrid, ProductToolbar, ReceiptModal, buildSale,
  BillDiscountModal, CouponInput, ChargesPickerModal, CheckoutModal,
  ModifierPickerModal, KotPreviewModal,
} from '@billing/ui/organisms';
import type { CheckoutPayload } from '@billing/ui/organisms';
import contextCls from '@billing/ui/organisms/cashier.module.css';
import { Icon, Text } from '@billing/ui/atoms';
import { PageHeader } from '../CounterShell';
import { STRINGS } from '@billing/shared/domain/strings';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useSettings } from '@billing/shared/store/SettingsContext';
import { useToast } from '@billing/shared/store/ToastContext';
import { useTable } from '@billing/shared/hooks/useTable';
import {
  computeCartTotals, snapshotBillDiscount, snapshotCoupon, snapshotCharge,
} from '@billing/shared/domain/computeSaleTotals';
import type {
  Product, Sale, SaleLine, SaleLineModifier,
  SaleCharge, SaleBillDiscount, SaleCoupon, PaymentMethod,
} from '@billing/shared/domain/types';
import type {
  OrderType, DiningTable, FloorSection, MenuCategory,
  Discount, Coupon, AdditionalCharge, Modifier, Variant,
} from '@billing/shared/domain/restaurant';

/* -------------------------------------------------------------------------- */
export const CashierPage: FC = () => {
  const { activeProducts, decrementStock } = useProducts();
  const { customers, addLending, create: createCustomer } = useCustomers();
  const { recordSale, sales } = useSales();
  const { currentUser, currentStoreId } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  /* -- DB-backed catalogs ------------------------------------------------ */
  const orderTypesApi = useTable<OrderType>('orderTypes');
  const tablesApi     = useTable<DiningTable>('diningTables');
  const sectionsApi   = useTable<FloorSection>('sections');
  const menuCatsApi   = useTable<MenuCategory>('menuCategories');
  const discountsApi  = useTable<Discount>('discounts');
  const couponsApi    = useTable<Coupon>('coupons');
  const chargesApi    = useTable<AdditionalCharge>('addlCharges');
  const modifiersApi  = useTable<Modifier>('modifiers');
  const variantsApi   = useTable<Variant>('variants');

  /* -- Cart + product-grid state ----------------------------------------- */
  const [query, setQuery] = useState('');
  const [categoryName, setCategoryName] = useState<string>('All');
  const [draftLines, setDraftLines] = useState<SaleLine[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  /* -- Sale context ------------------------------------------------------ *
   * NOTE: order type, table and customer are now collected inside the      *
   * CheckoutModal itself. This page no longer keeps any of that state.    */

  /* -- Money ------------------------------------------------------------- */
  const [billDiscount, setBillDiscount] = useState<SaleBillDiscount | undefined>();
  const [coupon, setCoupon] = useState<SaleCoupon | undefined>();
  const [charges, setCharges] = useState<SaleCharge[]>([]);

  /* -- Modal state ------------------------------------------------------- */
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  const [showCharges, setShowCharges] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [modifyingProduct, setModifyingProduct] = useState<Product | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showKot, setShowKot] = useState<Sale | null>(null);

  /* -- Derived ----------------------------------------------------------- */
  // Charges filter needs an order type - the checkout modal decides that,
  // so during cart building we just show all charges not scoped to a type.

  const menuCategoryLabels = useMemo(
    () => ['All', ...menuCatsApi.rows.filter((c) => c.active).map((c) => c.name)],
    [menuCatsApi.rows],
  );

  const filteredProducts = useMemo<readonly Product[]>(() =>
    activeProducts.filter((p) =>
      (categoryName === 'All' || String(p.category) === categoryName) &&
      (query.trim() === '' || p.name.toLowerCase().includes(query.toLowerCase()))
    ),
  [activeProducts, categoryName, query]);

  const totals = useMemo(() => computeCartTotals({
    lines: draftLines,
    taxRate: settings.taxRate,
    billDiscount, coupon, charges,
  }), [draftLines, settings.taxRate, billDiscount, coupon, charges]);

  const productVariants = useMemo<Record<string, Variant[]>>(() => {
    const map: Record<string, Variant[]> = {};
    variantsApi.rows.forEach((v) => {
      if (!map[v.menuItemId]) map[v.menuItemId] = [];
      map[v.menuItemId]!.push(v);
    });
    return map;
  }, [variantsApi.rows]);

  /* -- Cart mutations ---------------------------------------------------- */
  const upsertLine = (line: SaleLine, replace = false) => {
    setDraftLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === line.productId
        && l.variantId === line.variantId
        && sameMods(l.modifiers ?? [], line.modifiers ?? []));
      if (idx < 0) return [...prev, line];
      const next = [...prev];
      const existing = next[idx]!;
      next[idx] = replace
        ? line
        : { ...existing,
            quantity: existing.quantity + line.quantity,
            lineTotal: (existing.quantity + line.quantity) * line.unitPrice - (existing.lineDiscount ?? 0) };
      return next;
    });
    setFlashId(line.productId);
    window.setTimeout(() => setFlashId(null), 400);
  };

  const addProduct = (productId: string) => {
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    const inCart = draftLines.reduce((s, l) => s + (l.productId === productId ? l.quantity : 0), 0);
    if (inCart >= product.stock) {
      toast.error(`${product.name}: ${STRINGS.errors.outOfStock}`);
      return;
    }
    const variantsForProduct = productVariants[productId] ?? [];
    const hasRequiredMods = modifiersApi.rows.some((m) => m.active && m.required);
    if (variantsForProduct.length > 0 || hasRequiredMods) {
      setModifyingProduct(product);
      return;
    }
    upsertLine({
      productId, sku: product.sku, name: product.name, tone: product.tone,
      unitPrice: product.price, quantity: 1, lineTotal: product.price,
      originalUnitPrice: product.price,
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setDraftLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === productId);
      if (idx < 0) return prev;
      const line = prev[idx]!;
      const nextQty = line.quantity + delta;
      const next = [...prev];
      if (nextQty <= 0) { next.splice(idx, 1); return next; }
      next[idx] = { ...line, quantity: nextQty, lineTotal: nextQty * line.unitPrice - (line.lineDiscount ?? 0) };
      return next;
    });
  };
  const removeLine = (productId: string) =>
    setDraftLines((prev) => prev.filter((l) => l.productId !== productId));
  const clearAll = () => {
    setDraftLines([]);
    setBillDiscount(undefined);
    setCoupon(undefined);
    setCharges([]);
  };

  /* -- Money mutations --------------------------------------------------- */
  const toggleCharge = (c: AdditionalCharge) => {
    setCharges((prev) => {
      if (prev.find((x) => x.chargeId === c.id)) return prev.filter((x) => x.chargeId !== c.id);
      const snap = snapshotCharge(c, totals.taxableBase || totals.subtotalAfterLine || totals.grossSubtotal);
      return [...prev, snap];
    });
  };



  /* -- Payment / commit -------------------------------------------------- */
  const openPayment = () => {
    if (draftLines.length === 0) { toast.error(STRINGS.errors.emptyCart); return; }
    setShowPayment(true);
  };

  /**
   * completeSale runs when CheckoutModal fires onConfirm. The modal has
   * already validated that lending/COD tenders have a customer attached,
   * dine-in has a table, delivery has an address, etc.
   */
  const completeSale = async (payload: CheckoutPayload) => {
    if (!currentUser || !currentStoreId) return;
    const {
      payments, orderTypeCode, tableId, tableCode,
      customerId, customerMobile, customerName,
    } = payload;

    if (customerId) {
      const lendingTender = payments.find((p) => p.method === 'lending');
      if (lendingTender) await addLending(customerId, lendingTender.amount);
    }

    const primary = (payments[0]?.method ?? 'cash') as PaymentMethod;
    const currentOrderType = orderTypesApi.rows.find((o) => o.code === orderTypeCode) ?? null;
    const sale = buildSale({
      lines: draftLines,
      subtotal: totals.grossSubtotal, tax: totals.tax, total: totals.total,
      paymentMethod: primary,
      customerMobile: customerMobile ?? null,
      customerId:     customerId ?? null,
      customerName:   customerName ?? null,
      cashierId: currentUser.id, cashierName: currentUser.name, storeId: currentStoreId,
      orderTypeCode: orderTypeCode ?? undefined,
      ...(tableId ? { tableId } : {}),
      ...(tableCode ? { tableCode } : {}),
      billDiscount, coupon,
      lineDiscountTotal: totals.lineDiscountTotal,
      charges, payments,
      ...(payload.note ? { note: payload.note } : {}),
      ...(payload.deliveryAddress ? { deliveryAddress: payload.deliveryAddress } : {}),
    });
    await recordSale(sale);
    await decrementStock(draftLines.map((l) => ({ productId: l.productId, qty: l.quantity })));
    setLastSale(sale);
    setShowPayment(false);
    if (currentOrderType && currentOrderType.kotPrefix) setShowKot(sale);
    clearAll();
    toast.success(`Sale ${sale.invoiceNo} recorded.`);
  };

  /* -- Cart panel money-slot content (chip row + breakdown rows) --------- */
  const fmt = (n: number) => `Rs ${n.toFixed(2)}`;
  const moneyActions = draftLines.length === 0 ? null : (
    <>
      <button
        className={`${contextCls.contextChip} ${billDiscount ? contextCls['contextChip--filled'] : ''}`}
        onClick={() => setShowBillDiscount(true)}
      >
        <Icon name="coins" size={12} />
        <span>{billDiscount ? `-${fmt(billDiscount.amount)}` : 'Discount'}</span>
      </button>
      <CouponInput
        coupons={couponsApi.rows}
        subtotalAfterBillDiscount={totals.subtotalAfterLine - totals.billDiscountAmount}
        currentCouponCode={coupon?.code ?? null}
        onApply={(c) => setCoupon(snapshotCoupon(c, totals.subtotalAfterLine - totals.billDiscountAmount))}
        onClear={() => setCoupon(undefined)}
        onError={(m) => toast.error(m)}
      />
      <button
        className={`${contextCls.contextChip} ${charges.length ? contextCls['contextChip--filled'] : ''}`}
        onClick={() => setShowCharges(true)}
      >
        <Icon name="plus" size={12} />
        <span>{charges.length ? `${charges.length} charge${charges.length === 1 ? '' : 's'}` : 'Add charge'}</span>
      </button>
    </>
  );
  // Extra rows appear inside the totals block between Subtotal and Tax. Only
  // discounts/coupon/charges that were actually applied are shown - no
  // duplication of gross subtotal (that IS the CartPanel.subtotal prop).
  const extraTotalsRows = draftLines.length === 0 ? null : (
    <>
      {billDiscount && (
        <div className={contextCls.totalsRow}>
          <Text size="sm" tone="subtle">{billDiscount.name}</Text>
          <Text size="sm" weight="heavy" tone="primary">-{fmt(billDiscount.amount)}</Text>
        </div>
      )}
      {coupon && (
        <div className={contextCls.totalsRow}>
          <Text size="sm" tone="subtle">Coupon {coupon.code}</Text>
          <Text size="sm" weight="heavy" tone="primary">-{fmt(coupon.amount)}</Text>
        </div>
      )}
      {charges.map((c) => (
        <div key={c.chargeId} className={contextCls.totalsRow}>
          <Text size="sm" tone="subtle">{c.name}</Text>
          <Text size="sm" weight="heavy">+{fmt(c.amount)}</Text>
        </div>
      ))}
    </>
  );

  return (
    <>
      <PageHeader title={STRINGS.cashier.pageTitle} subtitle={STRINGS.cashier.pageSubtitle} />


      <div className={pages.cashierLayout}>
        <section aria-label="Product catalog">
          <ProductToolbar
            query={query} onQueryChange={setQuery}
            categories={menuCategoryLabels as unknown as readonly string[]}
            category={categoryName as unknown as never}
            onCategoryChange={(name: string) => setCategoryName(name)}
          />
          <ProductGrid
            products={filteredProducts}
            cart={Object.fromEntries(draftLines.map((l) => [l.productId, l.quantity]))}
            flashId={flashId}
            onAdd={addProduct}
          />
        </section>

        <CartPanel
          lines={draftLines}
          subtotal={totals.grossSubtotal - totals.lineDiscountTotal}
          tax={totals.tax}
          total={totals.total}
          unitCount={totals.unitCount}
          onIncrement={(id) => changeQty(id, +1)}
          onDecrement={(id) => changeQty(id, -1)}
          onRemove={removeLine}
          onClear={clearAll}
          onCharge={openPayment}
          moneyActions={moneyActions}
          extraTotalsRows={extraTotalsRows}
        />
      </div>

      {/* Money row moved INTO CartPanel via moneyActions + extraTotalsRows slots. */}

      {/* Mobile: sticky bottom bar + bottom-sheet cart */}
      <MobileCartBar
        unitCount={totals.unitCount}
        total={totals.total}
        onOpen={() => setMobileCartOpen(true)}
      />
      {mobileCartOpen && (
        <div role="dialog" aria-modal="true" aria-label={STRINGS.cashier.cartTitle}
             onClick={(e) => { if (e.target === e.currentTarget) setMobileCartOpen(false); }}
             className={pages.sheetOverlay}>
          <div className={pages.sheetPanel}>
            <CartPanel
              variant="sheet"
              onClose={() => setMobileCartOpen(false)}
              lines={draftLines}
              subtotal={totals.grossSubtotal - totals.lineDiscountTotal}
              tax={totals.tax}
              total={totals.total}
              unitCount={totals.unitCount}
              onIncrement={(id) => changeQty(id, +1)}
              onDecrement={(id) => changeQty(id, -1)}
              onRemove={removeLine}
              onClear={clearAll}
              onCharge={() => { setMobileCartOpen(false); openPayment(); }}
              moneyActions={moneyActions}
              extraTotalsRows={extraTotalsRows}
            />
          </div>
        </div>
      )}

      {/* ---- Modals ---- */}
      {showBillDiscount && (
        <BillDiscountModal
          discounts={discountsApi.rows}
          subtotalAfterLine={totals.subtotalAfterLine}
          onApply={(d, adhoc) => setBillDiscount(snapshotBillDiscount(d, adhoc, totals.subtotalAfterLine))}
          onClear={() => setBillDiscount(undefined)}
          onClose={() => setShowBillDiscount(false)}
        />
      )}

      {showCharges && (
        <ChargesPickerModal
          charges={chargesApi.rows}
          orderTypeCode={null}
          appliedChargeIds={charges.map((c) => c.chargeId)}
          subtotalAfterCoupon={totals.taxableBase}
          onToggle={toggleCharge}
          onClose={() => setShowCharges(false)}
        />
      )}

      {showPayment && (
        <CheckoutModal
          total={totals.total}
          onClose={() => setShowPayment(false)}
          onConfirm={completeSale}
          orderTypes={orderTypesApi.rows}
          tables={tablesApi.rows}
          sections={sectionsApi.rows}
          customers={customers}
          recentSales={sales}
          onCreateCustomer={async (name, mobile) => {
            const r = await createCustomer({ name, mobile, email: null, notes: null });
            if (!r.ok) { toast.error(`Could not create: ${r.error}`); return null; }
            return r.customer;
          }}
        />
      )}

      {modifyingProduct && (
        <ModifierPickerModal
          product={modifyingProduct}
          variants={productVariants[modifyingProduct.id] ?? []}
          modifiers={modifiersApi.rows.filter((m) => m.active)}
          onConfirm={({ quantity, variantId, variantLabel, unitPrice, modifiers, note }) => {
            upsertLine({
              productId: modifyingProduct.id,
              sku: modifyingProduct.sku,
              name: modifyingProduct.name,
              tone: modifyingProduct.tone,
              unitPrice, quantity,
              lineTotal: unitPrice * quantity,
              originalUnitPrice: modifyingProduct.price,
              ...(variantId ? { variantId } : {}),
              ...(variantLabel ? { variantLabel } : {}),
              ...(modifiers.length ? { modifiers } : {}),
              ...(note ? { note } : {}),
            });
            setModifyingProduct(null);
          }}
          onClose={() => setModifyingProduct(null)}
        />
      )}

      {showKot && (
        <KotPreviewModal
          sale={showKot}
          onClose={() => setShowKot(null)}
          onPrint={() => { window.print(); setShowKot(null); }}
        />
      )}

      {lastSale && !showPayment && !showKot && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Helper - true if two modifier lists match (by optionId set)                */
/* -------------------------------------------------------------------------- */
const sameMods = (a: readonly SaleLineModifier[], b: readonly SaleLineModifier[]): boolean => {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map((m) => m.optionId));
  return b.every((m) => setA.has(m.optionId));
};
