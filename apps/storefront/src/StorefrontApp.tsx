// StorefrontApp - customer-facing shop router. Mounted at /:slug/* by <Shell />.
// URL shape: /<slug>/<page>
//   /velvet                 -> Home
//   /velvet/browse          -> Browse (?q=... &category=...)
//   /velvet/product/<id>    -> PDP
//   /velvet/cart            -> Cart
//   /velvet/checkout        -> Checkout
//   /velvet/order/<id>      -> Confirmation
//
// The slug lives in a URL param that everything downstream reads via
// useParams({ slug }) or the useTenantSlug() shared helper.
//
// Each page is lazy-loaded: the initial storefront visit only ships the
// HomePage bundle, not every checkout/PDP page the visitor may never see.
import { lazy, Suspense, type FC, type JSX } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppSplash, ErrorBoundary, NotFoundPage } from '@billing/ui/errors';
import { StorefrontTenantProvider } from './state/StorefrontTenantContext';
import { CartProvider } from './state/CartContext';
import { StorefrontShell } from './StorefrontShell';

// Lazy pages - each becomes its own chunk. Landing on / only pulls HomePage.
const HomePage           = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const BrowsePage         = lazy(() => import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage })));
const ProductPage        = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const CartPage           = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderConfirmedPage = lazy(() => import('./pages/OrderConfirmedPage').then((m) => ({ default: m.OrderConfirmedPage })));

const R = (label: string, node: JSX.Element): JSX.Element => (
  <ErrorBoundary label={label}>
    <Suspense fallback={<AppSplash state="loading" onRetry={() => window.location.reload()} />}>
      {node}
    </Suspense>
  </ErrorBoundary>
);

export const StorefrontApp: FC = () => (
  <StorefrontTenantProvider>
    <CartProvider>
      <StorefrontShell>
        <Routes>
          <Route index                       element={R('sf-home',     <HomePage />)} />
          <Route path="browse"               element={R('sf-browse',   <BrowsePage />)} />
          <Route path="product/:productId"   element={R('sf-product',  <ProductPage />)} />
          <Route path="cart"                 element={R('sf-cart',     <CartPage />)} />
          <Route path="checkout"             element={R('sf-checkout', <CheckoutPage />)} />
          <Route path="order/:orderId"       element={R('sf-order',    <OrderConfirmedPage />)} />
          <Route path="*"                    element={<NotFoundPage />} />
        </Routes>
      </StorefrontShell>
    </CartProvider>
  </StorefrontTenantProvider>
);
