// StorefrontApp - customer-facing shop router. Mounted at /:slug/* by <Shell />.
// URL shape: /<slug>/<page>
//   /myntra                 -> Home
//   /myntra/browse          -> Browse (?q=... &category=...)
//   /myntra/product/<id>    -> PDP
//   /myntra/cart            -> Cart
//   /myntra/checkout        -> Checkout
//   /myntra/order/<id>      -> Confirmation
//
// The slug lives in a URL param that everything downstream reads via
// useParams({ slug }) or the useTenantSlug() shared helper.
import type { FC } from 'react';
import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '@shared/errors';
import { StorefrontTenantProvider } from './state/StorefrontTenantContext';
import { CartProvider } from './state/CartContext';
import { StorefrontShell } from './StorefrontShell';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmedPage } from './pages/OrderConfirmedPage';

export const StorefrontApp: FC = () => (
  <StorefrontTenantProvider>
    <CartProvider>
      <StorefrontShell>
        <Routes>
          <Route index                       element={<HomePage />} />
          <Route path="browse"               element={<BrowsePage />} />
          <Route path="product/:productId"   element={<ProductPage />} />
          <Route path="cart"                 element={<CartPage />} />
          <Route path="checkout"             element={<CheckoutPage />} />
          <Route path="order/:orderId"       element={<OrderConfirmedPage />} />
          <Route path="*"                    element={<NotFoundPage />} />
        </Routes>
      </StorefrontShell>
    </CartProvider>
  </StorefrontTenantProvider>
);
