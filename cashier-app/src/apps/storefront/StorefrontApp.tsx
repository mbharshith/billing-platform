// StorefrontApp - customer-facing shop router. Mounted at /shop/* by <Shell />.
// URL shape: /shop/<tenantSlug>/<page>
//   /shop/myntra                 -> Home
//   /shop/myntra/browse          -> Browse (?q=... &category=...)
//   /shop/myntra/product/<id>    -> PDP
//   /shop/myntra/cart            -> Cart
//   /shop/myntra/checkout        -> Checkout
//   /shop/myntra/order/<id>      -> Confirmation
import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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

// TenantShop - everything below here has a resolved tenant + a cart in context.
const TenantShop: FC = () => (
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

export const StorefrontApp: FC = () => (
  <Routes>
    <Route index                 element={<Navigate to="myntra" replace />} />
    <Route path=":tenantSlug/*"  element={<TenantShop />} />
    <Route path="*"              element={<NotFoundPage />} />
  </Routes>
);
