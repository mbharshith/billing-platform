// CheckoutPage - numbered-step flow: details, address, payment, summary.
import { useMemo, useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Icon, Input, Textarea } from '@shared/atoms';
import { CenteredMessage } from '@shared/templates';
import { useProducts } from '@shared/store/ProductsContext';
import { useCustomers } from '@shared/store/CustomersContext';
import { useSales } from '@shared/store/SalesContext';
import { useToast } from '@shared/store/ToastContext';
import { useStorefrontTenant } from '../state/StorefrontTenantContext';
import { useStorefrontMoney } from '../state/useStorefrontMoney';
import { useCart, priceCart } from '../state/CartContext';
import { getTenantTheme } from '../lib/tenantTheme';
import { storeIdToSlug } from '@shared/lib/resolveTenant';
import { digitsOnly, isValidPhone, nextInvoiceNo } from '@shared/domain/format';
import {
  SYSTEM_ACTOR_ID, SYSTEM_ACTOR_NAME, type PaymentMethod, type Sale,
} from '@shared/domain/types';
import cls from '../storefront.module.css';

const PAY_OPTIONS: ReadonlyArray<{
  method: PaymentMethod; title: string; hint: string; icon: 'cash' | 'card';
}> = [
  { method: 'cod',    title: 'Cash on delivery', hint: 'Pay when the rider hands it over.',  icon: 'cash' },
  { method: 'online', title: 'Pay online now',   hint: 'Card / UPI / wallet (mocked demo).', icon: 'card' },
];

export const CheckoutPage: FC = () => {
  const tenant = useStorefrontTenant();
  const { allProducts, decrementStock } = useProducts();
  const { ensureFromMobile } = useCustomers();
  const { placeOnlineOrder } = useSales();
  const { money, taxRate } = useStorefrontMoney();
  const { lines, clear } = useCart();
  const toast = useToast();
  const theme = getTenantTheme(tenant.id);
  const navigate = useNavigate();
  const slug = storeIdToSlug(tenant.id);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState(tenant.city);
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);

  const tenantProducts = useMemo(
    () => allProducts.filter((p) => p.storeId === tenant.id),
    [allProducts, tenant.id],
  );
  const priced = useMemo(
    () => priceCart(lines, tenantProducts, taxRate),
    [lines, tenantProducts, taxRate],
  );

  if (priced.lines.length === 0) return (
    <CenteredMessage
      icon="cart" iconTone="muted"
      title="Nothing to check out"
      body="Add items to your cart first."
      footer={<Link to={`/${slug}/browse`} className={cls.hero__cta}>Browse products</Link>}
    />
  );

  const canSubmit = name.trim().length >= 2
    && isValidPhone(mobile)
    && line1.trim().length >= 3
    && city.trim().length >= 2
    && pincode.trim().length >= 4;

  const handlePlace = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const cleanMobile = digitsOnly(mobile);
      const customer = await ensureFromMobile(cleanMobile, tenant.id, name.trim());

      const now = new Date().toISOString();
      const saleId = crypto.randomUUID();
      const order: Sale = {
        id: saleId,
        invoiceNo: nextInvoiceNo(),
        completedAt: now,
        lines: priced.lines.map((l) => ({
          productId: l.product.id, sku: l.product.sku, name: l.product.name, tone: l.product.tone,
          unitPrice: l.product.price, quantity: l.quantity, lineTotal: l.lineTotal,
        })),
        subtotal: priced.subtotal, tax: priced.tax, total: priced.total,
        unitCount: priced.unitCount,
        paymentMethod: method,
        customerMobile: cleanMobile,
        customerId: customer?.id ?? null,
        cashierId: SYSTEM_ACTOR_ID,
        cashierName: SYSTEM_ACTOR_NAME,
        voided: false, voidedAt: null, voidedReason: null,
        storeId: tenant.id,
        channel: 'online',
        orderStatus: 'placed',
        customerName: name.trim(),
        deliveryAddress: {
          line1: line1.trim(), line2: line2.trim(),
          city: city.trim(), pincode: pincode.trim(), landmark: landmark.trim(),
        },
        customerNotes: notes.trim() || null,
        statusHistory: [{
          status: 'placed', at: now, by: 'customer', note: 'Order placed via storefront',
        }],
      };

      await placeOnlineOrder(order);
      await decrementStock(priced.lines.map((l) => ({ productId: l.product.id, qty: l.quantity })));
      clear();
      toast.success(`Order ${order.invoiceNo} placed!`);
      navigate(`/${slug}/order/${saleId}`, { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[checkout] place order failed:', err);
      toast.error('Could not place your order. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Link to={`/${slug}/cart`} className={cls.pageBackLink}>
        <Icon name="arrow" size={14} flipX /> Back to cart
      </Link>

      <div className={cls.sectionHead}>
        <div>
          <h1 className={cls.sectionHead__title}>Checkout</h1>
          <div className={cls.sectionHead__sub}>
            {priced.unitCount} {priced.unitCount === 1 ? 'item' : 'items'} · arriving in {theme.deliveryEta}
          </div>
        </div>
      </div>

      <div className={cls.checkoutLayout}>
        <form onSubmit={(e) => { e.preventDefault(); handlePlace(); }}>
          <section className={cls.checkoutSection}>
            <h2 className={cls.checkoutSection__title}>
              <span className={cls.checkoutSection__step}>1</span>
              Contact details
            </h2>
            <div className={cls.checkoutGrid2}>
              <Field label="Full name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  autoComplete="name" placeholder="e.g. Priya Sharma" />
              </Field>
              <Field label="Mobile number" required
                error={mobile && !isValidPhone(mobile) ? 'Enter a 10-digit number' : undefined}>
                <Input value={mobile} onChange={(e) => setMobile(digitsOnly(e.target.value).slice(0, 10))}
                  autoComplete="tel" inputMode="numeric" placeholder="10-digit number" />
              </Field>
            </div>
          </section>

          <section className={cls.checkoutSection}>
            <h2 className={cls.checkoutSection__title}>
              <span className={cls.checkoutSection__step}>2</span>
              Delivery address
            </h2>
            <Field label="Street / building" required>
              <Input value={line1} onChange={(e) => setLine1(e.target.value)}
                placeholder="House number, street" autoComplete="address-line1" />
            </Field>
            <Field label="Area / locality">
              <Input value={line2} onChange={(e) => setLine2(e.target.value)}
                placeholder="Colony, sector, etc." autoComplete="address-line2" />
            </Field>
            <div className={cls.checkoutGrid2}>
              <Field label="City" required>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2" />
              </Field>
              <Field label="Pincode / ZIP" required>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)}
                  autoComplete="postal-code" inputMode="numeric" />
              </Field>
            </div>
            <Field label="Landmark (optional)" hint="Helps our rider find you faster.">
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite City Bank" />
            </Field>
            <Field label="Notes for the store (optional)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} placeholder="Delivery instructions, gift wrap, etc." />
            </Field>
          </section>

          <section className={cls.checkoutSection}>
            <h2 className={cls.checkoutSection__title}>
              <span className={cls.checkoutSection__step}>3</span>
              Payment method
            </h2>
            {PAY_OPTIONS.map((opt) => (
              <label
                key={opt.method}
                className={`${cls.payChoice} ${method === opt.method ? cls['payChoice--active'] : ''}`}
              >
                <input
                  type="radio" name="payment" value={opt.method}
                  checked={method === opt.method}
                  onChange={() => setMethod(opt.method)}
                  className={cls.srOnly}
                />
                <div className={cls.payChoice__icon}><Icon name={opt.icon} size={18} /></div>
                <div className={cls.payChoice__body}>
                  <div className={cls.payChoice__title}>{opt.title}</div>
                  <div className={cls.payChoice__hint}>{opt.hint}</div>
                </div>
                <div className={cls.payChoice__radio} aria-hidden="true" />
              </label>
            ))}
          </section>
        </form>

        <aside className={cls.summaryCard} aria-label="Order summary">
          <h2 className={cls.summaryCard__title}>Bill summary</h2>
          <div className={cls.summaryRow}>
            <span>Item total</span>
            <span>{money(priced.subtotal)}</span>
          </div>
          <div className={cls.summaryRow}>
            <span>Tax & fees</span>
            <span>{money(priced.tax)}</span>
          </div>
          <div className={`${cls.summaryRow} ${cls['summaryRow--free']}`}>
            <span>Delivery</span>
            <span>FREE</span>
          </div>
          <div className={`${cls.summaryRow} ${cls['summaryRow--total']}`}>
            <span>To pay</span>
            <span>{money(priced.total)}</span>
          </div>
          <button
            type="button"
            className={cls.summaryCta}
            disabled={!canSubmit || submitting}
            onClick={handlePlace}
          >
            {submitting ? 'Placing…' : `Place order · ${money(priced.total)}`}
          </button>
          <div className={cls.summarySavings}>
            <Icon name="shield" size={12} /> Safe & secure checkout
          </div>
        </aside>
      </div>
    </>
  );
};
