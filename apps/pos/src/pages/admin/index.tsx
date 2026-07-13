// All TMBill admin pages - grouped into one module for now to make Phase 1-7
// scaffolding tractable. When any individual page grows beyond simple CRUD
// (needs its own hooks, custom fields, multi-step forms), promote it to its
// own file in ./pages/ and route accordingly.
//
// Layout:
//   PHASE 1 - POS Configuration        (10 pages)
//   PHASE 2 - Menu Management          (5 pages)
//   PHASE 3 - Tables & KDS             (4 pages)
//   PHASE 4 - Online & Delivery        (3 pages)
//   PHASE 6 - Inventory                (5 pages)
//   PHASE 7 - CRM & Loyalty            (5 pages)
//   OVERVIEW - Dashboard + Live orders
//
// All page components are named exports of pattern: <Entity>Page.

import type { FC } from 'react';
import { CrudPage, boolField, numField, selectField, textField } from '@billing/ui/admin';
import { useTable } from '@billing/shared/hooks/useTable';
import type {
  Market, Brand, Outlet, PaymentMode, OrderType, TaxSlab, Discount,
  AdditionalCharge, Reason, MenuCategory, Modifier, Combo, Variant,
  FloorSection, DiningTable, KotStation, AggregatorConfig, DeliveryZone,
  Ingredient, Supplier, WastageEntry, CustomerGroup, LoyaltyTier, Coupon,
  FeedbackEntry,
} from '@billing/shared/domain/restaurant';



/* ========================================================================== */
/* PHASE 1  POS Configuration                                                 */
/* ========================================================================== */

export const MarketsPage: FC = () => {
  const api = useTable<Market>('markets', false);
  return (
    <CrudPage<Market>
      title="Markets"
      subtitle="Geographic regions your brands operate in."
      breadcrumb={['POS Configuration', 'Markets']}
      api={api}
      searchPlaceholder="Search by name or code..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', code: '', country: '', currency: 'INR', active: true })}
      fields={[
        textField('name',     'Name',     true),
        textField('code',     'Code',     true),
        textField('country',  'Country',  true),
        textField('currency', 'Currency (ISO 4217)', true),
        boolField('active',   'Active'),
      ]}
      columns={[
        { key: 'name',     label: 'Name',     sortValue: (r) => r.name,     render: (r) => r.name },
        { key: 'code',     label: 'Code',     sortValue: (r) => r.code,     render: (r) => r.code },
        { key: 'country',  label: 'Country',  sortValue: (r) => r.country,  render: (r) => r.country },
        { key: 'currency', label: 'Currency', render: (r) => r.currency },
      ]}
    />
  );
};

export const BrandsPage: FC = () => {
  const api = useTable<Brand>('brands', false);
  const markets = useTable<Market>('markets', false);
  return (
    <CrudPage<Brand>
      title="Brands"
      subtitle="Restaurant brands owned by your organisation."
      breadcrumb={['POS Configuration', 'Brands']}
      api={api}
      searchPlaceholder="Search brands..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', marketId: markets.rows[0]?.id ?? '', logoUrl: null, cuisineType: '', active: true })}
      fields={[
        textField('name',        'Brand name', true),
        selectField('marketId',  'Market', markets.rows.map((m) => ({ value: m.id, label: m.name }))),
        textField('cuisineType', 'Cuisine',    true),
        boolField('active',      'Active'),
      ]}
      columns={[
        { key: 'name',    label: 'Brand',   sortValue: (r) => r.name,        render: (r) => r.name },
        { key: 'cuisine', label: 'Cuisine', sortValue: (r) => r.cuisineType, render: (r) => r.cuisineType },
        { key: 'market',  label: 'Market',
          render: (r) => markets.rows.find((m) => m.id === r.marketId)?.name ?? '—' },
      ]}
    />
  );
};

export const OutletsPage: FC = () => {
  // Tenant-scoped: outlets belong to a store. useTable auto-stamps storeId
  // on create and filters the list by the current tenant.
  const api = useTable<Outlet>('outlets', true);
  const brands = useTable<Brand>('brands', false);
  return (
    <CrudPage<Outlet>
      title="Outlets"
      subtitle="Physical restaurant locations."
      breadcrumb={['POS Configuration', 'Outlets']}
      api={api}
      searchPlaceholder="Search outlets by name or city..."
      searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', brandId: brands.rows[0]?.id ?? '', marketId: '', city: '',
                          phone: '', address: '', taxRate: 0.05, currency: 'INR',
                          seatCapacity: 40, active: true, status: 'active' as const })}
      fields={[
        textField('name',    'Outlet name', true),
        selectField('brandId', 'Brand',
          brands.rows.map((b) => ({ value: b.id, label: b.name }))),
        textField('city',    'City',    true),
        textField('phone',   'Phone'),
        textField('address', 'Address'),
        { key: 'seatCapacity', label: 'Seat capacity', type: 'number', min: 0, step: 1 },
        { key: 'taxRate',      label: 'Tax rate (e.g. 0.05)', type: 'number', min: 0, step: 0.01 },
        textField('currency','Currency (ISO)'),
        boolField('active',  'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Outlet', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'brand', label: 'Brand',
          render: (r) => brands.rows.find((b) => b.id === r.brandId)?.name ?? '—' },
        { key: 'city',  label: 'City',  sortValue: (r) => r.city, render: (r) => r.city },
        { key: 'seats', label: 'Seats', numeric: true, render: (r) => String(r.seatCapacity) },
        { key: 'phone', label: 'Phone', render: (r) => r.phone },
      ]}
    />
  );
};

const PAYMENT_CATEGORIES: readonly { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },  { value: 'wallet', label: 'Wallet' },
  { value: 'aggregator', label: 'Aggregator' },
  { value: 'comp', label: 'Complimentary' }, { value: 'other', label: 'Other' },
];

export const PaymentModesPage: FC = () => {
  const api = useTable<PaymentMode>('paymentModes');
  return (
    <CrudPage<PaymentMode>
      title="Payment Modes"
      subtitle="Cash, card, UPI, wallets, aggregator settlements."
      breadcrumb={['POS Configuration', 'Payment Modes']}
      api={api}
      searchFn={(r, q) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', code: '', category: 'cash', requiresReference: false, active: true })}
      fields={[
        textField('name', 'Display name', true),
        textField('code', 'Code',         true),
        selectField('category', 'Category', PAYMENT_CATEGORIES),
        boolField('requiresReference', 'Requires reference no.'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',     label: 'Name',     sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'code',     label: 'Code',     render: (r) => r.code },
        { key: 'category', label: 'Category', render: (r) => r.category },
        { key: 'ref',      label: 'Ref req.', render: (r) => (r.requiresReference ? 'Yes' : 'No') },
      ]}
    />
  );
};

export const OrderTypesPage: FC = () => {
  const api = useTable<OrderType>('orderTypes');
  return (
    <CrudPage<OrderType>
      title="Order Types"
      subtitle="How an order enters your kitchen (Dine-in, Takeaway, Delivery, aggregators)."
      breadcrumb={['POS Configuration', 'Order Types']}
      api={api}
      searchFn={(r, q) => r.name.toLowerCase().includes(q)}
      makeEmpty={() => ({ name: '', code: '', icon: 'bag', kotPrefix: '',
                          chargeExtra: false, extraChargePercent: 0, active: true })}
      fields={[
        textField('name',      'Name', true),
        textField('code',      'Code', true),
        textField('kotPrefix', 'KOT prefix (1-2 chars)', true),
        boolField('chargeExtra', 'Charge extra %'),
        { key: 'extraChargePercent', label: 'Extra %', type: 'number', min: 0, step: 0.5 },
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',   label: 'Name',    sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'code',   label: 'Code',    render: (r) => r.code },
        { key: 'prefix', label: 'KOT #',   render: (r) => r.kotPrefix },
        { key: 'xtra',   label: 'Extra %', numeric: true,
          render: (r) => r.chargeExtra ? `${r.extraChargePercent}%` : '—' },
      ]}
    />
  );
};

export const TaxSlabsPage: FC = () => {
  const api = useTable<TaxSlab>('taxSlabs');
  return (
    <CrudPage<TaxSlab>
      title="Tax Slabs"
      subtitle="GST / VAT rates for food, beverages, liquor."
      breadcrumb={['POS Configuration', 'Tax Slabs']}
      api={api}
      makeEmpty={() => ({ name: '', percent: 5, inclusive: false, appliesTo: 'food' as const, active: true })}
      fields={[
        textField('name', 'Name', true),
        { key: 'percent', label: 'Percent (e.g. 5)', type: 'number', min: 0, step: 0.25 },
        selectField('appliesTo', 'Applies to', [
          { value: 'food', label: 'Food' }, { value: 'beverage', label: 'Beverage' },
          { value: 'liquor', label: 'Liquor' }, { value: 'all', label: 'All items' },
        ]),
        boolField('inclusive', 'Price inclusive of tax'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',    label: 'Name',    sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'percent', label: '%',       numeric: true, render: (r) => `${r.percent}%` },
        { key: 'applies', label: 'Applies', render: (r) => r.appliesTo },
        { key: 'incl',    label: 'Inclusive', render: (r) => (r.inclusive ? 'Yes' : 'No') },
      ]}
    />
  );
};

export const DiscountsPage: FC = () => {
  const api = useTable<Discount>('discounts');
  return (
    <CrudPage<Discount>
      title="Discounts"
      subtitle="Manager overrides, happy hours, staff meals."
      breadcrumb={['POS Configuration', 'Discounts']}
      api={api}
      makeEmpty={() => ({ name: '', type: 'percent' as const, value: 10, maxAmount: null,
                          requiresManagerApproval: false, active: true })}
      fields={[
        textField('name', 'Name', true),
        selectField('type', 'Type', [
          { value: 'percent', label: 'Percent' }, { value: 'flat', label: 'Flat amount' },
          { value: 'bogo', label: 'BOGO' },
        ]),
        { key: 'value', label: 'Value', type: 'number', min: 0, step: 1 },
        boolField('requiresManagerApproval', 'Requires manager approval'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Name',   sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'type',  label: 'Type',   render: (r) => r.type },
        { key: 'value', label: 'Value',  numeric: true,
          render: (r) => r.type === 'percent' ? `${r.value}%` : String(r.value) },
        { key: 'mgr',   label: 'Manager?', render: (r) => (r.requiresManagerApproval ? 'Yes' : 'No') },
      ]}
    />
  );
};

export const ChargesPage: FC = () => {
  const api = useTable<AdditionalCharge>('addlCharges');
  return (
    <CrudPage<AdditionalCharge>
      title="Additional Charges"
      subtitle="Service, delivery, packing charges."
      breadcrumb={['POS Configuration', 'Charges']}
      api={api}
      makeEmpty={() => ({ name: '', type: 'percent' as const, value: 5,
                          appliesToOrderTypeCodes: [], taxable: false, active: true })}
      fields={[
        textField('name', 'Name', true),
        selectField('type', 'Type', [
          { value: 'percent', label: 'Percent' }, { value: 'flat', label: 'Flat' },
        ]),
        { key: 'value', label: 'Value', type: 'number', min: 0, step: 1 },
        boolField('taxable', 'Taxable'),
        boolField('active',  'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Name',  sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'type',  label: 'Type',  render: (r) => r.type },
        { key: 'value', label: 'Value', numeric: true,
          render: (r) => r.type === 'percent' ? `${r.value}%` : String(r.value) },
        { key: 'tax',   label: 'Taxable', render: (r) => (r.taxable ? 'Yes' : 'No') },
      ]}
    />
  );
};

export const ReasonsPage: FC = () => {
  const api = useTable<Reason>('reasons');
  return (
    <CrudPage<Reason>
      title="Reason Master"
      subtitle="Void, cancel, refund, wastage and discount reasons for reporting."
      breadcrumb={['POS Configuration', 'Reasons']}
      api={api}
      searchFn={(r, q) => r.text.toLowerCase().includes(q)}
      makeEmpty={() => ({ text: '', category: 'void' as const, active: true })}
      fields={[
        textField('text', 'Reason', true),
        selectField('category', 'Category', [
          { value: 'void', label: 'Void' }, { value: 'cancel', label: 'Cancel' },
          { value: 'refund', label: 'Refund' }, { value: 'wastage', label: 'Wastage' },
          { value: 'discount', label: 'Discount' },
        ]),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'text',     label: 'Reason',   sortValue: (r) => r.text, render: (r) => r.text },
        { key: 'category', label: 'Category', sortValue: (r) => r.category, render: (r) => r.category },
      ]}
    />
  );
};

/* ========================================================================== */
/* PHASE 2  Menu Management                                                   */
/* ========================================================================== */

export const MenuCategoriesPage: FC = () => {
  const api = useTable<MenuCategory>('menuCategories');
  const stations = useTable<KotStation>('kotStations');
  return (
    <CrudPage<MenuCategory>
      title="Menu Categories"
      subtitle="Group menu items and route to the right kitchen station."
      breadcrumb={['Menu', 'Categories']}
      api={api}
      makeEmpty={() => ({ name: '', sortOrder: 99, iconUrl: null,
                          kotStationId: stations.rows[0]?.id ?? null, active: true })}
      fields={[
        textField('name', 'Category name', true),
        numField('sortOrder', 'Sort order'),
        selectField('kotStationId', 'KOT station',
          stations.rows.map((s) => ({ value: s.id, label: s.name })), false),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'sort',    label: '#',     numeric: true, sortValue: (r) => r.sortOrder,
          render: (r) => String(r.sortOrder) },
        { key: 'name',    label: 'Category', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'station', label: 'KOT station',
          render: (r) => stations.rows.find((s) => s.id === r.kotStationId)?.name ?? '—' },
      ]}
    />
  );
};

export const ModifiersPage: FC = () => {
  const api = useTable<Modifier>('modifiers');
  return (
    <CrudPage<Modifier>
      title="Modifiers"
      subtitle="Add-ons and options (spice level, extra cheese, portion size)."
      breadcrumb={['Menu', 'Modifiers']}
      api={api}
      makeEmpty={() => ({ name: '', type: 'single' as const, required: false, options: [], active: true })}
      fields={[
        textField('name', 'Modifier name', true),
        selectField('type', 'Selection type', [
          { value: 'single', label: 'Single (radio)' }, { value: 'multi', label: 'Multi (checkbox)' },
        ]),
        boolField('required', 'Required'),
        boolField('active',   'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Modifier', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'type', label: 'Type',     render: (r) => r.type },
        { key: 'req',  label: 'Required', render: (r) => (r.required ? 'Yes' : 'No') },
        { key: 'opts', label: 'Options',  numeric: true, render: (r) => String(r.options.length) },
      ]}
    />
  );
};

export const CombosPage: FC = () => {
  const api = useTable<Combo>('combos');
  return (
    <CrudPage<Combo>
      title="Combos"
      subtitle="Bundled meals at a fixed price."
      breadcrumb={['Menu', 'Combos']}
      api={api}
      makeEmpty={() => ({ name: '', bundlePrice: 0, itemIds: [], active: true })}
      fields={[
        textField('name', 'Combo name', true),
        numField('bundlePrice', 'Bundle price', 1),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Combo', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'price', label: 'Price', numeric: true, render: (r) => String(r.bundlePrice) },
        { key: 'count', label: 'Items', numeric: true, render: (r) => String(r.itemIds.length) },
      ]}
    />
  );
};

export const VariantsPage: FC = () => {
  const api = useTable<Variant>('variants');
  return (
    <CrudPage<Variant>
      title="Variants"
      subtitle="Half/full, small/medium/large size variants of menu items."
      breadcrumb={['Menu', 'Variants']}
      api={api}
      makeEmpty={() => ({ label: '', menuItemId: '', priceOverride: 0, active: true })}
      fields={[
        textField('menuItemId', 'Menu item ID', true),
        textField('label',      'Variant label', true),
        numField('priceOverride', 'Price override', 1),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'item',  label: 'Menu item ID', render: (r) => r.menuItemId },
        { key: 'label', label: 'Variant',      render: (r) => r.label },
        { key: 'price', label: 'Price',        numeric: true, render: (r) => String(r.priceOverride) },
      ]}
    />
  );
};

/* ========================================================================== */
/* PHASE 3  Tables & KDS                                                      */
/* ========================================================================== */

export const SectionsPage: FC = () => {
  const api = useTable<FloorSection>('sections');
  return (
    <CrudPage<FloorSection>
      title="Floor Sections"
      subtitle="Group tables by zone (Ground Floor, Rooftop, Bar)."
      breadcrumb={['Tables', 'Sections']}
      api={api}
      makeEmpty={() => ({ name: '', sortOrder: 99, active: true })}
      fields={[
        textField('name', 'Section name', true),
        numField('sortOrder', 'Sort order'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'sort', label: '#', numeric: true, sortValue: (r) => r.sortOrder, render: (r) => String(r.sortOrder) },
        { key: 'name', label: 'Section', sortValue: (r) => r.name, render: (r) => r.name },
      ]}
    />
  );
};

export const TablesPage: FC = () => {
  const api = useTable<DiningTable>('diningTables');
  const sections = useTable<FloorSection>('sections');
  return (
    <CrudPage<DiningTable>
      title="Tables"
      subtitle="Every dining table across your outlet."
      breadcrumb={['Tables', 'Tables']}
      api={api}
      makeEmpty={() => ({ code: '', sectionId: sections.rows[0]?.id ?? '', seats: 4,
                          status: 'free' as const, currentSaleId: null, active: true })}
      fields={[
        textField('code', 'Table code (T-01)', true),
        selectField('sectionId', 'Section',
          sections.rows.map((s) => ({ value: s.id, label: s.name }))),
        numField('seats', 'Seats'),
        selectField('status', 'Status', [
          { value: 'free', label: 'Free' },        { value: 'occupied', label: 'Occupied' },
          { value: 'reserved', label: 'Reserved' }, { value: 'cleaning', label: 'Cleaning' },
        ]),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'code',  label: 'Table',   sortValue: (r) => r.code, render: (r) => r.code },
        { key: 'sec',   label: 'Section',
          render: (r) => sections.rows.find((s) => s.id === r.sectionId)?.name ?? '—' },
        { key: 'seats', label: 'Seats',   numeric: true, render: (r) => String(r.seats) },
        { key: 'status',label: 'Status',  render: (r) => r.status },
      ]}
    />
  );
};

export const KotStationsPage: FC = () => {
  const api = useTable<KotStation>('kotStations');
  return (
    <CrudPage<KotStation>
      title="KOT Stations"
      subtitle="Kitchen stations that receive printed order tickets."
      breadcrumb={['Tables', 'KOT Stations']}
      api={api}
      makeEmpty={() => ({ name: '', printer: '', active: true })}
      fields={[
        textField('name', 'Station name', true),
        textField('printer', 'Printer name / IP'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',    label: 'Station', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'printer', label: 'Printer', render: (r) => r.printer },
      ]}
    />
  );
};

/* ========================================================================== */
/* PHASE 4  Online & Delivery                                                 */
/* ========================================================================== */

export const AggregatorsPage: FC = () => {
  const api = useTable<AggregatorConfig>('aggregators');
  return (
    <CrudPage<AggregatorConfig>
      title="Aggregators"
      subtitle="Zomato, Swiggy and your own online storefront."
      breadcrumb={['Online', 'Aggregators']}
      api={api}
      hasActiveToggle={false}
      makeEmpty={() => ({ provider: 'zomato' as const, enabled: false, outletId: '',
                          commissionPercent: 20, autoAccept: false, kotPrefix: 'Z',
                          credentialsMasked: '' })}
      fields={[
        selectField('provider', 'Provider', [
          { value: 'zomato', label: 'Zomato' }, { value: 'swiggy', label: 'Swiggy' },
          { value: 'ubereats', label: 'Uber Eats' }, { value: 'dunzo', label: 'Dunzo' },
          { value: 'own', label: 'Own storefront' },
        ]),
        boolField('enabled',      'Enabled'),
        { key: 'commissionPercent', label: 'Commission %', type: 'number', min: 0, step: 0.5 },
        boolField('autoAccept',   'Auto-accept orders'),
        textField('kotPrefix',    'KOT prefix'),
      ]}
      columns={[
        { key: 'prov',    label: 'Provider',  render: (r) => r.provider },
        { key: 'enabled', label: 'Enabled',   render: (r) => (r.enabled ? 'Yes' : 'No') },
        { key: 'comm',    label: 'Commission',numeric: true, render: (r) => `${r.commissionPercent}%` },
        { key: 'auto',    label: 'Auto-accept', render: (r) => (r.autoAccept ? 'Yes' : 'No') },
      ]}
    />
  );
};

export const DeliveryZonesPage: FC = () => {
  const api = useTable<DeliveryZone>('deliveryZones');
  return (
    <CrudPage<DeliveryZone>
      title="Delivery Zones"
      subtitle="Radius-based delivery pricing and minimum order values."
      breadcrumb={['Online', 'Delivery Zones']}
      api={api}
      makeEmpty={() => ({ name: '', pincodes: [], minOrder: 0, deliveryFee: 0, etaMinutes: 30, active: true })}
      fields={[
        textField('name', 'Zone name', true),
        numField('minOrder', 'Min order'),
        numField('deliveryFee', 'Delivery fee'),
        numField('etaMinutes', 'ETA (minutes)'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name', label: 'Zone',  sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'min',  label: 'Min',   numeric: true, render: (r) => String(r.minOrder) },
        { key: 'fee',  label: 'Fee',   numeric: true, render: (r) => String(r.deliveryFee) },
        { key: 'eta',  label: 'ETA',   numeric: true, render: (r) => `${r.etaMinutes} min` },
        { key: 'pin',  label: 'Pincodes', numeric: true, render: (r) => String(r.pincodes.length) },
      ]}
    />
  );
};

/* ========================================================================== */
/* PHASE 6  Inventory                                                         */
/* ========================================================================== */

export const IngredientsPage: FC = () => {
  const api = useTable<Ingredient>('ingredients');
  return (
    <CrudPage<Ingredient>
      title="Ingredients"
      subtitle="Raw materials tracked at the kitchen level."
      breadcrumb={['Inventory', 'Ingredients']}
      api={api}
      makeEmpty={() => ({ name: '', unit: 'kg' as const, currentStock: 0,
                          reorderLevel: 0, costPerUnit: 0, active: true })}
      fields={[
        textField('name', 'Ingredient', true),
        selectField('unit', 'Unit', [
          { value: 'g',  label: 'grams' }, { value: 'kg', label: 'kg' },
          { value: 'ml', label: 'ml' },    { value: 'l',  label: 'litres' },
          { value: 'unit', label: 'unit' },{ value: 'dozen', label: 'dozen' },
        ]),
        numField('currentStock', 'Current stock'),
        numField('reorderLevel', 'Reorder level'),
        numField('costPerUnit', 'Cost per unit'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Ingredient', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'unit',  label: 'Unit',  render: (r) => r.unit },
        { key: 'stock', label: 'Stock', numeric: true, render: (r) => String(r.currentStock) },
        { key: 'reord', label: 'Reorder at', numeric: true, render: (r) => String(r.reorderLevel) },
        { key: 'cost',  label: 'Cost/unit', numeric: true, render: (r) => String(r.costPerUnit) },
      ]}
    />
  );
};

export const SuppliersPage: FC = () => {
  const api = useTable<Supplier>('suppliers');
  return (
    <CrudPage<Supplier>
      title="Suppliers"
      subtitle="Vendors you buy raw materials from."
      breadcrumb={['Inventory', 'Suppliers']}
      api={api}
      makeEmpty={() => ({ name: '', contact: '', email: '', gstin: '', paymentTerms: 'Net 30', active: true })}
      fields={[
        textField('name',    'Supplier name', true),
        textField('contact', 'Contact number'),
        textField('email',   'Email'),
        textField('gstin',   'GSTIN'),
        textField('paymentTerms', 'Payment terms'),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',    label: 'Supplier', sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'contact', label: 'Phone',    render: (r) => r.contact },
        { key: 'email',   label: 'Email',    render: (r) => r.email },
        { key: 'terms',   label: 'Terms',    render: (r) => r.paymentTerms },
      ]}
    />
  );
};

export const WastagePage: FC = () => {
  const api = useTable<WastageEntry>('wastage');
  const ings = useTable<Ingredient>('ingredients');
  return (
    <CrudPage<WastageEntry>
      title="Wastage"
      subtitle="Track spoilage, prep errors and other losses for reporting."
      breadcrumb={['Inventory', 'Wastage']}
      api={api}
      hasActiveToggle={false}
      makeEmpty={() => ({ ingredientId: ings.rows[0]?.id ?? '', quantity: 0,
                          reasonId: '', reportedBy: '',
                          reportedAt: new Date().toISOString(), costImpact: 0 })}
      fields={[
        selectField('ingredientId', 'Ingredient',
          ings.rows.map((i) => ({ value: i.id, label: i.name }))),
        numField('quantity', 'Quantity', 0.1),
        textField('reasonId', 'Reason id'),
        textField('reportedBy', 'Reported by'),
        numField('costImpact', 'Cost impact'),
      ]}
      columns={[
        { key: 'ing',  label: 'Ingredient',
          render: (r) => ings.rows.find((i) => i.id === r.ingredientId)?.name ?? r.ingredientId },
        { key: 'qty',  label: 'Qty',       numeric: true, render: (r) => String(r.quantity) },
        { key: 'cost', label: 'Cost',      numeric: true, render: (r) => String(r.costImpact) },
        { key: 'by',   label: 'Reported by', render: (r) => r.reportedBy },
      ]}
    />
  );
};

/* ========================================================================== */
/* PHASE 7  CRM & Loyalty                                                     */
/* ========================================================================== */

export const CustomerGroupsPage: FC = () => {
  const api = useTable<CustomerGroup>('customerGroups');
  return (
    <CrudPage<CustomerGroup>
      title="Customer Groups"
      subtitle="Tags you can bulk-apply to reward loyal segments."
      breadcrumb={['CRM', 'Customer Groups']}
      api={api}
      makeEmpty={() => ({ name: '', discountPercent: 0, customerCount: 0, active: true })}
      fields={[
        textField('name', 'Group name', true),
        numField('discountPercent', 'Discount %', 1),
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Group',  sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'disc',  label: 'Discount', numeric: true, render: (r) => `${r.discountPercent}%` },
        { key: 'count', label: 'Members', numeric: true, render: (r) => String(r.customerCount) },
      ]}
    />
  );
};

export const LoyaltyPage: FC = () => {
  const api = useTable<LoyaltyTier>('loyaltyTiers');
  return (
    <CrudPage<LoyaltyTier>
      title="Loyalty Tiers"
      subtitle="Silver, Gold, Platinum tiers and their perks."
      breadcrumb={['CRM', 'Loyalty']}
      api={api}
      makeEmpty={() => ({ name: '', minSpend: 0, earnRatePercent: 1, perks: '', active: true })}
      fields={[
        textField('name', 'Tier name', true),
        numField('minSpend', 'Min spend'),
        numField('earnRatePercent', 'Earn %', 0.5),
        { key: 'perks', label: 'Perks', type: 'textarea' },
        boolField('active', 'Active'),
      ]}
      columns={[
        { key: 'name',  label: 'Tier',      sortValue: (r) => r.name, render: (r) => r.name },
        { key: 'min',   label: 'Min spend', numeric: true, render: (r) => String(r.minSpend) },
        { key: 'earn',  label: 'Earn %',    numeric: true, render: (r) => `${r.earnRatePercent}%` },
      ]}
    />
  );
};

export const CouponsPage: FC = () => {
  const api = useTable<Coupon>('coupons');
  return (
    <CrudPage<Coupon>
      title="Coupons"
      subtitle="Promo codes with min-order and usage caps."
      breadcrumb={['CRM', 'Coupons']}
      api={api}
      searchFn={(r, q) => r.code.toLowerCase().includes(q)}
      makeEmpty={() => ({ code: '', type: 'percent' as const, value: 10, minOrder: 0,
                          maxRedeem: 100, usedCount: 0,
                          validFrom: new Date().toISOString(), validTo: new Date().toISOString(),
                          active: true })}
      fields={[
        textField('code', 'Coupon code', true),
        selectField('type', 'Type', [
          { value: 'percent', label: 'Percent' }, { value: 'flat', label: 'Flat' },
        ]),
        numField('value',     'Value'),
        numField('minOrder',  'Min order'),
        numField('maxRedeem', 'Max redemptions'),
        boolField('active',   'Active'),
      ]}
      columns={[
        { key: 'code',  label: 'Code',   sortValue: (r) => r.code, render: (r) => r.code },
        { key: 'type',  label: 'Type',   render: (r) => r.type },
        { key: 'value', label: 'Value',  numeric: true,
          render: (r) => r.type === 'percent' ? `${r.value}%` : String(r.value) },
        { key: 'used',  label: 'Used',   numeric: true,
          render: (r) => `${r.usedCount} / ${r.maxRedeem}` },
      ]}
    />
  );
};

export const FeedbackPage: FC = () => {
  const api = useTable<FeedbackEntry>('feedback');
  return (
    <CrudPage<FeedbackEntry>
      title="Customer Feedback"
      subtitle="Ratings and comments left after each meal."
      breadcrumb={['CRM', 'Feedback']}
      api={api}
      hasActiveToggle={false}
      searchFn={(r, q) => r.customerName.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q)}
      makeEmpty={() => ({ customerId: null, customerName: '', rating: 5 as const,
                          comment: '', saleId: null, at: new Date().toISOString(), resolved: false })}
      fields={[
        textField('customerName', 'Customer name', true),
        numField('rating', 'Rating (1-5)'),
        { key: 'comment', label: 'Comment', type: 'textarea' },
        boolField('resolved', 'Resolved'),
      ]}
      columns={[
        { key: 'cust',  label: 'Customer', sortValue: (r) => r.customerName, render: (r) => r.customerName },
        { key: 'rate',  label: 'Rating',   numeric: true, render: (r) => '*'.repeat(r.rating) },
        { key: 'cmt',   label: 'Comment',  render: (r) => r.comment },
        { key: 'res',   label: 'Resolved', render: (r) => (r.resolved ? 'Yes' : 'No') },
      ]}
    />
  );
};


