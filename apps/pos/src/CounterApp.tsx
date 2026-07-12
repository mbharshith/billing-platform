// CounterApp - exports the two tenant staff sub-apps.
//
// /:slug/cashier/*   -> <CashierApp />  cashier-facing terminal (top-nav)
// /:slug/admin/*     -> <AdminApp />    admin console with vertical sidebar
//
// Every page is React.lazy'd for tiny per-route chunks.

import { lazy, Suspense, type FC, type JSX, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from '@billing/ui/guards';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@billing/ui/errors';
import { CounterShell } from './CounterShell';
import { AdminShellRoute } from './AdminShellRoute';

/* -------------------------------------------------------------------------- */
/* Cashier-facing pages (top-nav shell)                                       */
/* -------------------------------------------------------------------------- */
const CashierPage        = lazy(() => import('./pages/CashierPage').then(m => ({ default: m.CashierPage })));
const SalesPage          = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const SaleDetailPage     = lazy(() => import('./pages/SaleDetailPage').then(m => ({ default: m.SaleDetailPage })));
const CustomersPage      = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));

/* -------------------------------------------------------------------------- */
/* Admin pages - legacy (retained)                                            */
/* -------------------------------------------------------------------------- */
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage       = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const UsersPage          = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const SettingsPage       = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const StorePage          = lazy(() => import('./pages/StorePage').then(m => ({ default: m.StorePage })));

/* -------------------------------------------------------------------------- */
/* Admin pages - Phase 1-7 TMBill parity (single lazy chunk since they all    */
/* share the CrudPage helper; splitting hurts more than it helps here).       */
/* -------------------------------------------------------------------------- */
// Named-export unwrap helper: React.lazy needs a `default` export.
const named = <K extends string>(key: K) =>
  lazy(async () => {
    const m = (await import('./pages/admin')) as unknown as Record<K, FC>;
    const Cmp = m[key];
    return { default: Cmp };
  });

// TMBill admin routes - one lazy import per named export.
// Chunk-per-route not worth it: the underlying pages/admin/index module
// resolves to one file, so all these share the same admin chunk anyway.
const MarketsPage            = named('MarketsPage');
const BrandsPage             = named('BrandsPage');
const OutletsPage            = named('OutletsPage');
const PaymentModesPage       = named('PaymentModesPage');
const OrderTypesPage         = named('OrderTypesPage');
const TaxSlabsPage           = named('TaxSlabsPage');
const DiscountsPage          = named('DiscountsPage');
const ChargesPage            = named('ChargesPage');
const ReasonsPage            = named('ReasonsPage');
const OutletSettingsPage     = named('OutletSettingsPage');
const MenuCategoriesPage     = named('MenuCategoriesPage');
const ModifiersPage          = named('ModifiersPage');
const CombosPage             = named('CombosPage');
const VariantsPage           = named('VariantsPage');
const SectionsPage           = named('SectionsPage');
const TablesPage             = named('TablesPage');
const KotStationsPage        = named('KotStationsPage');
const KdsPage                = named('KdsPage');
const AggregatorsPage        = named('AggregatorsPage');
const DeliveryZonesPage      = named('DeliveryZonesPage');
const OnlineOrdersPage       = named('OnlineOrdersPage');
const LiveOrdersPage         = named('LiveOrdersPage');
const IngredientsPage        = named('IngredientsPage');
const RecipesPage            = named('RecipesPage');
const SuppliersPage          = named('SuppliersPage');
const PurchaseOrdersPage     = named('PurchaseOrdersPage');
const WastagePage            = named('WastagePage');
const CustomerGroupsPage     = named('CustomerGroupsPage');
const LoyaltyPage            = named('LoyaltyPage');
const CouponsPage            = named('CouponsPage');
const FeedbackPage           = named('FeedbackPage');
const SalesReportPage        = named('SalesReportPage');
const ProductMixReportPage   = named('ProductMixReportPage');
const HourlyReportPage       = named('HourlyReportPage');
const DiscountReportPage     = named('DiscountReportPage');
const TaxReportPage          = named('TaxReportPage');
const WastageReportPage      = named('WastageReportPage');
const CashierReportPage      = named('CashierReportPage');

// Route wrapper: ErrorBoundary + Suspense envelope per page.
const R = (label: string, node: ReactNode): JSX.Element => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<AppSplash state="loading" />}>{node}</Suspense>
  </ErrorBoundary>
);

/** Mounted at /:slug/cashier/*.  Cashier + views every staff member needs. */
export const CashierApp: FC = () => (
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route element={<CounterShell />}>
        <Route index                    element={R('cashier',         <CashierPage />)} />
        <Route path="sales"             element={R('sales',           <SalesPage />)} />
        <Route path="sales/:id"         element={R('sale-detail',     <SaleDetailPage />)} />
        <Route path="customers"         element={R('customers',       <CustomersPage />)} />
        <Route path="customers/:id"     element={R('customer-detail', <CustomerDetailPage />)} />
        <Route path="*"                 element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);

/** Mounted at /:slug/admin/*.  Full TMBill-parity admin console. */
export const AdminApp: FC = () => (
  <Routes>
    <Route element={<AdminRoute />}>
      <Route element={<AdminShellRoute />}>
        {/* ---- Overview ---- */}
        <Route index                    element={R('dashboard',      <DashboardPage />)} />
        <Route path="live-orders"       element={R('live-orders',    <LiveOrdersPage />)} />

        {/* ---- POS Config (Phase 1) ---- */}
        <Route path="markets"           element={R('markets',        <MarketsPage />)} />
        <Route path="brands"            element={R('brands',         <BrandsPage />)} />
        <Route path="outlets"           element={R('outlets',        <OutletsPage />)} />
        <Route path="payment-modes"     element={R('payments',       <PaymentModesPage />)} />
        <Route path="order-types"       element={R('order-types',    <OrderTypesPage />)} />
        <Route path="tax-slabs"         element={R('tax-slabs',      <TaxSlabsPage />)} />
        <Route path="discounts"         element={R('discounts',      <DiscountsPage />)} />
        <Route path="charges"           element={R('charges',        <ChargesPage />)} />
        <Route path="reasons"           element={R('reasons',        <ReasonsPage />)} />
        <Route path="outlet-settings"   element={R('outlet-settings',<OutletSettingsPage />)} />

        {/* ---- Menu (Phase 2) ---- */}
        <Route path="menu-categories"   element={R('menu-cats',      <MenuCategoriesPage />)} />
        <Route path="products"          element={R('menu-items',     <ProductsPage />)} />
        <Route path="modifiers"         element={R('modifiers',      <ModifiersPage />)} />
        <Route path="combos"            element={R('combos',         <CombosPage />)} />
        <Route path="variants"          element={R('variants',       <VariantsPage />)} />

        {/* ---- Tables & KDS (Phase 3) ---- */}
        <Route path="sections"          element={R('sections',       <SectionsPage />)} />
        <Route path="tables"            element={R('tables',         <TablesPage />)} />
        <Route path="kot-stations"      element={R('kot-stations',   <KotStationsPage />)} />
        <Route path="kds"               element={R('kds',            <KdsPage />)} />

        {/* ---- Online & Delivery (Phase 4) ---- */}
        <Route path="aggregators"       element={R('aggregators',    <AggregatorsPage />)} />
        <Route path="delivery-zones"    element={R('delivery-zones', <DeliveryZonesPage />)} />
        <Route path="online-orders"     element={R('online-orders',  <OnlineOrdersPage />)} />

        {/* ---- Reports (Phase 5 - stubs) ---- */}
        <Route path="reports/sales"     element={R('rpt-sales',      <SalesReportPage />)} />
        <Route path="reports/products"  element={R('rpt-prods',      <ProductMixReportPage />)} />
        <Route path="reports/hourly"    element={R('rpt-hourly',     <HourlyReportPage />)} />
        <Route path="reports/discounts" element={R('rpt-disc',       <DiscountReportPage />)} />
        <Route path="reports/tax"       element={R('rpt-tax',        <TaxReportPage />)} />
        <Route path="reports/wastage"   element={R('rpt-wast',       <WastageReportPage />)} />
        <Route path="reports/cashier"   element={R('rpt-cash',       <CashierReportPage />)} />

        {/* ---- Inventory (Phase 6) ---- */}
        <Route path="ingredients"       element={R('ingredients',    <IngredientsPage />)} />
        <Route path="recipes"           element={R('recipes',        <RecipesPage />)} />
        <Route path="suppliers"         element={R('suppliers',      <SuppliersPage />)} />
        <Route path="purchase-orders"   element={R('pos',            <PurchaseOrdersPage />)} />
        <Route path="wastage"           element={R('wastage',        <WastagePage />)} />

        {/* ---- CRM & Loyalty (Phase 7) ---- */}
        <Route path="customers"         element={R('customers',       <CustomersPage />)} />
        <Route path="customers/:id"     element={R('customer-detail', <CustomerDetailPage />)} />
        <Route path="customer-groups"   element={R('cust-groups',     <CustomerGroupsPage />)} />
        <Route path="loyalty"           element={R('loyalty',         <LoyaltyPage />)} />
        <Route path="coupons"           element={R('coupons',         <CouponsPage />)} />
        <Route path="feedback"          element={R('feedback',        <FeedbackPage />)} />

        {/* ---- Administration (existing) ---- */}
        <Route path="users"             element={R('users',      <UsersPage />)} />
        <Route path="sales"             element={R('sales',      <SalesPage />)} />
        <Route path="sales/:id"         element={R('sale-detail',<SaleDetailPage />)} />
        <Route path="settings"          element={R('settings',   <SettingsPage />)} />
        <Route path="store"             element={R('store',      <StorePage />)} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);

// Back-compat re-export.
export const CounterApp = CashierApp;
