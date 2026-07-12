// CashierPage - primary "ring up a sale" experience. Reads Products/Settings/Auth,
// writes Sales (record), Products (stock), Customers (create/link + lending).
import { useMemo, useState, type FC } from 'react';
import pages from './pages.module.css';
import {
  CartPanel, MobileCartBar, PaymentModal, ProductGrid, ProductToolbar, ReceiptModal, buildSale,
} from '@billing/ui/organisms';
import { PageHeader } from '@/CounterShell';
import { CATEGORY_FILTERS } from '@billing/shared/domain/catalog';
import { STRINGS } from '@billing/shared/domain/strings';
import { useAuth } from '@billing/shared/store/AuthContext';
import { useCustomers } from '@billing/shared/store/CustomersContext';
import { useProducts } from '@billing/shared/store/ProductsContext';
import { useSales } from '@billing/shared/store/SalesContext';
import { useSettings } from '@billing/shared/store/SettingsContext';
import { useToast } from '@billing/shared/store/ToastContext';
import type { PaymentMethod, Product, Sale, SaleLine } from '@billing/shared/domain/types';

type CategoryChoice = typeof CATEGORY_FILTERS[number];

export const CashierPage: FC = () => {
  const { activeProducts, decrementStock } = useProducts();
  const { recordSale } = useSales();
  const { ensureFromMobile, addLending } = useCustomers();
  const { currentUser, currentStoreId } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryChoice>('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [flashId, setFlashId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const filteredProducts = useMemo<readonly Product[]>(() =>
    activeProducts.filter((p) =>
      (category === 'All' || p.category === category) &&
      (query.trim() === '' || p.name.toLowerCase().includes(query.toLowerCase()))
    ),
  [activeProducts, category, query]);

  const cartLines = useMemo<readonly SaleLine[]>(() =>
    Object.entries(cart)
      .map<SaleLine | null>(([productId, quantity]) => {
        const product = activeProducts.find((p) => p.id === productId);
        if (!product) return null;
        return {
          productId,
          sku: product.sku,
          name: product.name,
          tone: product.tone,
          unitPrice: product.price,
          quantity,
          lineTotal: product.price * quantity,
        };
      })
      .filter((l): l is SaleLine => l !== null),
  [cart, activeProducts]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);
    const tax = subtotal * settings.taxRate;
    const unitCount = cartLines.reduce((s, l) => s + l.quantity, 0);
    return { subtotal, tax, total: subtotal + tax, unitCount };
  }, [cartLines, settings.taxRate]);

  const addToCart = (productId: string) => {
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    const inCart = cart[productId] ?? 0;
    if (inCart >= product.stock) {
      toast.error(`${product.name}: ${STRINGS.errors.outOfStock}`);
      return;
    }
    setCart((prev) => ({ ...prev, [productId]: inCart + 1 }));
    setFlashId(productId);
    window.setTimeout(() => setFlashId(null), 400);
  };

  const changeQty = (productId: string, delta: number) => {
    const product = activeProducts.find((p) => p.id === productId);
    setCart((prev) => {
      const next = { ...prev };
      const q = (next[productId] ?? 0) + delta;
      if (q <= 0) {
        delete next[productId];
      } else if (product && q > product.stock) {
        toast.error(`${product.name}: ${STRINGS.errors.outOfStock}`);
        return prev;
      } else {
        next[productId] = q;
      }
      return next;
    });
  };

  const removeLine = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };
  const clearCart = () => setCart({});

  const openPayment = () => {
    if (cartLines.length === 0) {
      toast.error(STRINGS.errors.emptyCart);
      return;
    }
    setPaymentOpen(true);
  };

  const completeSale = async (method: PaymentMethod, mobile: string | null) => {
    if (!currentUser || !currentStoreId) return;
    let customerId: string | null = null;
    if (method === 'lending' && mobile) {
      const customer = await ensureFromMobile(mobile);
      if (!customer) {
        toast.error(STRINGS.cashier.noActiveStore);
        return;
      }
      customerId = customer.id;
      await addLending(customerId, totals.total);
    }
    const sale = buildSale({
      lines: cartLines,
      subtotal: totals.subtotal,
      tax: totals.tax,
      paymentMethod: method,
      customerMobile: mobile,
      customerId,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      storeId: currentStoreId,
    });
    await recordSale(sale);
    await decrementStock(cartLines.map((l) => ({ productId: l.productId, qty: l.quantity })));
    setLastSale(sale);
    setCart({});
    setPaymentOpen(false);
    toast.success(`Sale ${sale.invoiceNo} recorded.`);
  };

  return (
    <>
      <PageHeader title={STRINGS.cashier.pageTitle} subtitle={STRINGS.cashier.pageSubtitle} />

      <div className={pages.cashierLayout}>
        <section aria-label="Product catalog">
          <ProductToolbar
            query={query}
            onQueryChange={setQuery}
            categories={CATEGORY_FILTERS}
            category={category}
            onCategoryChange={setCategory}
          />
          <ProductGrid
            products={filteredProducts}
            cart={cart}
            flashId={flashId}
            onAdd={addToCart}
          />
        </section>

        <CartPanel
          lines={cartLines}
          subtotal={totals.subtotal}
          tax={totals.tax}
          total={totals.total}
          unitCount={totals.unitCount}
          onIncrement={(id) => changeQty(id, +1)}
          onDecrement={(id) => changeQty(id, -1)}
          onRemove={removeLine}
          onClear={clearCart}
          onCharge={openPayment}
        />
      </div>

      {/* Mobile: sticky bottom bar + bottom-sheet cart (below 1024px only) */}
      <MobileCartBar
        unitCount={totals.unitCount}
        total={totals.total}
        onOpen={() => setMobileCartOpen(true)}
      />
      {mobileCartOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={STRINGS.cashier.cartTitle}
          onClick={(e) => { if (e.target === e.currentTarget) setMobileCartOpen(false); }}
          className={pages.sheetOverlay}
        >
          <div className={pages.sheetPanel}>
            <CartPanel
              variant="sheet"
              onClose={() => setMobileCartOpen(false)}
              lines={cartLines}
              subtotal={totals.subtotal}
              tax={totals.tax}
              total={totals.total}
              unitCount={totals.unitCount}
              onIncrement={(id) => changeQty(id, +1)}
              onDecrement={(id) => changeQty(id, -1)}
              onRemove={removeLine}
              onClear={clearCart}
              onCharge={() => { setMobileCartOpen(false); openPayment(); }}
            />
          </div>
        </div>
      )}

      {paymentOpen && (
        <PaymentModal
          total={totals.total}
          unitCount={totals.unitCount}
          onCancel={() => setPaymentOpen(false)}
          onConfirm={completeSale}
        />
      )}

      {lastSale && !paymentOpen && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </>
  );
};
