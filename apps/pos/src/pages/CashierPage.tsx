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
  OrderTypeToggle, TablePickerModal, CustomerPickerModal,
  BillDiscountModal, CouponInput, ChargesPickerModal, SplitPaymentModal,
  ModifierPickerModal, HeldOrdersDrawer, KotPreviewModal,
} from '@billing/ui/organisms';
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
  orderTypeNeedsTable,
} from '@billing/shared/domain/computeSaleTotals';
import type {
  Product, Sale, SaleLine, SaleLineModifier,
  SalePayment, SaleCharge, SaleBillDiscount, SaleCoupon, PaymentMethod, Customer,
} from '@billing/shared/domain/types';
import type {
  OrderType, DiningTable, FloorSection, MenuCategory,
  Discount, Coupon, AdditionalCharge, Modifier, Variant,
} from '@billing/shared/domain/restaurant';

/* -------------------------------------------------------------------------- */
export const CashierPage: FC = () => {
  const { activeProducts, decrementStock } = useProducts();
  const { customers, ensureFromMobile, addLending, create: createCustomer } = useCustomers();
  const { recordSale, holdSale, heldSales, resumeHeldSale, discardHeldSale } = useSales();
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

  /* -- Sale context (top bar) -------------------------------------------- */
  const [orderTypeCode, setOrderTypeCode] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  /* -- Money ------------------------------------------------------------- */
  const [billDiscount, setBillDiscount] = useState<SaleBillDiscount | undefined>();
  const [coupon, setCoupon] = useState<SaleCoupon | undefined>();
  const [charges, setCharges] = useState<SaleCharge[]>([]);

  /* -- Modal state ------------------------------------------------------- */
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  const [showCharges, setShowCharges] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [modifyingProduct, setModifyingProduct] = useState<Product | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showKot, setShowKot] = useState<Sale | null>(null);

  /* -- Derived ----------------------------------------------------------- */
  const currentOrderType = orderTypesApi.rows.find((o) => o.code === orderTypeCode) ?? null;
  const needsTable = orderTypeNeedsTable(currentOrderType);

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
    setSelectedTable(null);
    setSelectedCustomer(null);
  };

  /* -- Money mutations --------------------------------------------------- */
  const toggleCharge = (c: AdditionalCharge) => {
    setCharges((prev) => {
      if (prev.find((x) => x.chargeId === c.id)) return prev.filter((x) => x.chargeId !== c.id);
      const snap = snapshotCharge(c, totals.taxableBase || totals.subtotalAfterLine || totals.grossSubtotal);
      return [...prev, snap];
    });
  };

  /* -- Hold / recall ----------------------------------------------------- */
  const holdCurrent = async () => {
    if (draftLines.length === 0 || !currentUser || !currentStoreId) return;
    const sale = buildSale({
      lines: draftLines,
      subtotal: totals.grossSubtotal, tax: totals.tax, total: totals.total,
      paymentMethod: 'cash',
      customerMobile: selectedCustomer?.mobile ?? null,
      customerId: selectedCustomer?.id ?? null,
      customerName: selectedCustomer?.name ?? null,
      cashierId: currentUser.id, cashierName: currentUser.name, storeId: currentStoreId,
      orderTypeCode: orderTypeCode ?? undefined,
      tableId: selectedTable?.id, tableCode: selectedTable?.code,
      billDiscount, coupon,
      lineDiscountTotal: totals.lineDiscountTotal,
      charges,
    });
    await holdSale(sale);
    toast.success(`Sale held (${draftLines.length} items).`);
    clearAll();
  };

  const recall = async (s: Sale) => {
    const restored = await resumeHeldSale(s.id);
    if (!restored) { toast.error('Held sale no longer available.'); return; }
    setDraftLines([...restored.lines]);
    setOrderTypeCode(restored.orderTypeCode ?? null);
    setBillDiscount(restored.billDiscount);
    setCoupon(restored.coupon);
    setCharges(restored.charges ? [...restored.charges] : []);
    if (restored.tableId) {
      const t = tablesApi.rows.find((x) => x.id === restored.tableId);
      if (t) setSelectedTable(t);
    }
    if (restored.customerId) {
      const c = customers.find((x) => x.id === restored.customerId);
      if (c) setSelectedCustomer(c);
    }
    toast.success('Sale restored.');
  };

  /* -- Payment / commit -------------------------------------------------- */
  const openPayment = () => {
    if (draftLines.length === 0) { toast.error(STRINGS.errors.emptyCart); return; }
    if (needsTable && !selectedTable) { toast.error('Pick a table first.'); return; }
    setShowPayment(true);
  };

  const completeSale = async (payments: readonly SalePayment[], enteredMobile: string | null) => {
    if (!currentUser || !currentStoreId) return;
    let customerId = selectedCustomer?.id ?? null;
    let customerMobile = selectedCustomer?.mobile ?? enteredMobile;
    if (payments.some((p) => p.method === 'lending' || p.method === 'cod')) {
      if (!customerMobile) { toast.error('Customer mobile required for lending / COD.'); return; }
      if (!customerId) {
        const c = await ensureFromMobile(customerMobile);
        if (!c) { toast.error('Could not attach customer.'); return; }
        customerId = c.id;
      }
      const lendingTender = payments.find((p) => p.method === 'lending');
      if (lendingTender && customerId) await addLending(customerId, lendingTender.amount);
    }
    const primary = (payments[0]?.method ?? 'cash') as PaymentMethod;
    const sale = buildSale({
      lines: draftLines,
      subtotal: totals.grossSubtotal, tax: totals.tax, total: totals.total,
      paymentMethod: primary,
      customerMobile, customerId,
      customerName: selectedCustomer?.name ?? null,
      cashierId: currentUser.id, cashierName: currentUser.name, storeId: currentStoreId,
      orderTypeCode: orderTypeCode ?? undefined,
      tableId: selectedTable?.id, tableCode: selectedTable?.code,
      billDiscount, coupon,
      lineDiscountTotal: totals.lineDiscountTotal,
      charges, payments,
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

  /* -- Render ------------------------------------------------------------ */
  const tableChipLabel = selectedTable
    ? `Table ${selectedTable.code}`
    : (needsTable ? 'Pick table' : 'No table');

  return (
    <>
      <PageHeader title={STRINGS.cashier.pageTitle} subtitle={STRINGS.cashier.pageSubtitle} />

      {/* Context bar - order type / table / customer / hold-recall */}
      <div className={contextCls.contextBar}>
        <OrderTypeToggle
          types={orderTypesApi.rows}
          selectedCode={orderTypeCode}
          onSelect={(c) => {
            setOrderTypeCode(c);
            const ot = orderTypesApi.rows.find((x) => x.code === c);
            if (!orderTypeNeedsTable(ot ?? null)) setSelectedTable(null);
          }}
        />

        {needsTable && (
          <button
            className={`${contextCls.contextChip} ${selectedTable ? contextCls['contextChip--filled'] : ''}`}
            onClick={() => setShowTablePicker(true)}
          >
            <Icon name="group" size={14} />
            <span>{tableChipLabel}</span>
          </button>
        )}

        <button
          className={`${contextCls.contextChip} ${selectedCustomer ? contextCls['contextChip--filled'] : ''}`}
          onClick={() => setShowCustomerPicker(true)}
        >
          <Icon name="user" size={14} />
          <span>{selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}</span>
        </button>

        <div className={contextCls.contextSpacer} />

        <button className={contextCls.contextChip} onClick={holdCurrent} disabled={draftLines.length === 0}>
          <Icon name="history" size={14} /><span>Hold</span>
        </button>
        <button className={contextCls.contextChip} onClick={() => setShowHeld(true)}>
          <Icon name="history" size={14} />
          <span>Held ({heldSales.length})</span>
        </button>
      </div>

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
      {showTablePicker && (
        <TablePickerModal
          sections={sectionsApi.rows} tables={tablesApi.rows}
          selectedTableId={selectedTable?.id ?? null}
          onSelect={(t) => setSelectedTable(t)}
          onClose={() => setShowTablePicker(false)}
        />
      )}

      {showCustomerPicker && (
        <CustomerPickerModal
          customers={customers}
          onSelect={(c) => setSelectedCustomer(c)}
          onCreate={async (name, mobile) => {
            const r = await createCustomer({ name, mobile, email: null, notes: null });
            if (!r.ok) { toast.error(`Could not create: ${r.error}`); throw new Error(r.error); }
            return r.customer;
          }}
          onClose={() => setShowCustomerPicker(false)}
        />
      )}

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
          orderTypeCode={orderTypeCode}
          appliedChargeIds={charges.map((c) => c.chargeId)}
          subtotalAfterCoupon={totals.taxableBase}
          onToggle={toggleCharge}
          onClose={() => setShowCharges(false)}
        />
      )}

      {showPayment && (
        <SplitPaymentModal
          total={totals.total}
          onClose={() => setShowPayment(false)}
          onConfirm={completeSale}
        />
      )}

      {showHeld && (
        <HeldOrdersDrawer
          held={heldSales}
          onRecall={recall}
          onDiscard={async (s) => { await discardHeldSale(s.id); toast.success('Held sale discarded.'); }}
          onClose={() => setShowHeld(false)}
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
