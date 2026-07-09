// MarketingHomePage - unauthenticated SaaS landing page at /.
//
// PHASE 1 (this commit): minimal placeholder so the URL restructure builds
//   and the app boots cleanly on /. Content is intentionally sparse.
//
// PHASE 2 (next commit): full black+gold luxury marketing surface with real
//   Unsplash imagery, "What we provide", "Contact Walmart", etc.
import type { FC } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { storeIdToSlug } from '@shared/lib/resolveTenant';

export const MarketingHomePage: FC = () => {
  const { currentUser, currentStoreId } = useAuth();
  const { byId } = useStores();

  // Signed-in staff shouldn't see the marketing home - send them to their app.
  if (currentUser) {
    if (currentUser.role === 'vendor') return <Navigate to="/dashboard" replace />;
    const store = byId(currentStoreId);
    if (store) return <Navigate to={`/${storeIdToSlug(store.id)}/cashier`} replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#0a0a0a',
      color: '#f5f2ed',
      padding: 40,
      textAlign: 'center',
      fontFamily: "'Fraunces', Georgia, serif",
    }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: '#d4af37',
          marginBottom: 24,
          fontWeight: 500,
        }}>
          QuickBill Commerce Cloud
        </div>
        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '0 0 20px',
        }}>
          Retail commerce, <em style={{ fontWeight: 400 }}>refined.</em>
        </h1>
        <p style={{
          fontSize: 17,
          fontStyle: 'italic',
          fontWeight: 300,
          lineHeight: 1.6,
          color: 'rgba(245, 242, 237, 0.72)',
          margin: '0 auto 40px',
          maxWidth: 520,
        }}>
          Point-of-sale, inventory, and delivery-ready storefronts &#8212;
          one platform for every square metre of your business.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" style={{
            background: '#d4af37',
            color: '#0a0a0a',
            padding: '16px 32px',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid #d4af37',
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Sign in
          </Link>
          <Link to="/myntra" style={{
            background: 'transparent',
            color: '#f5f2ed',
            padding: '16px 32px',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid rgba(245, 242, 237, 0.32)',
            fontFamily: "'Montserrat', sans-serif",
          }}>
            View demo storefront
          </Link>
        </div>
        <p style={{
          marginTop: 64,
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(245, 242, 237, 0.4)',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 500,
        }}>
          Full marketing site &#8212; coming next commit
        </p>
      </div>
    </div>
  );
};
