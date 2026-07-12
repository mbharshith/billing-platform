// AdminSidebar + AdminShell + AdminPage + TopBar - admin routes chrome.
// Sidebar itself lives in ./Sidebar.tsx (kept < 600-line convention).

import { useEffect, useState, type FC, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import cls from './admin.module.css';
import { Icon, Text, ThemeToggle } from '@billing/ui/atoms';
import { ToastStack } from '@billing/ui/feedback';
import { AdminSidebar, type SidebarGroup, type SidebarLink } from './Sidebar';

export type { SidebarLink, SidebarGroup };
export { AdminSidebar };

export const SIDEBAR_GROUPS: readonly SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'zap',
    defaultOpen: true,
    links: [
      { path: '',              label: 'Dashboard',       icon: 'chart' },
      { path: 'live-orders',   label: 'Live Orders',     icon: 'zap' },
    ],
  },
  {
    id: 'pos',
    label: 'POS Configuration',
    icon: 'settings',
    defaultOpen: true,
    links: [
      { path: 'markets',           label: 'Markets',            icon: 'globe' },
      { path: 'brands',            label: 'Brands',             icon: 'star' },
      { path: 'outlets',           label: 'Outlets',            icon: 'store' },
      { path: 'payment-modes',     label: 'Payment Modes',      icon: 'card' },
      { path: 'order-types',       label: 'Order Types',        icon: 'bag' },
      { path: 'tax-slabs',         label: 'Tax Slabs',          icon: 'tag' },
      { path: 'discounts',         label: 'Discounts',          icon: 'coins' },
      { path: 'charges',           label: 'Additional Charges', icon: 'plus' },
      { path: 'reasons',           label: 'Reason Master',      icon: 'shield' },
      { path: 'outlet-settings',   label: 'Print & Terminal',   icon: 'print' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu Management',
    icon: 'list',
    defaultOpen: true,
    links: [
      { path: 'menu-categories', label: 'Categories',   icon: 'list' },
      { path: 'products',        label: 'Menu Items',   icon: 'bag' },
      { path: 'modifiers',       label: 'Modifiers',    icon: 'plus' },
      { path: 'combos',          label: 'Combos',       icon: 'layers' },
      { path: 'variants',        label: 'Variants',     icon: 'edit' },
    ],
  },
  {
    id: 'tables',
    label: 'Tables & KDS',
    icon: 'flame',
    defaultOpen: false,
    links: [
      { path: 'sections',     label: 'Floor Sections', icon: 'group' },
      { path: 'tables',       label: 'Tables',         icon: 'group' },
      { path: 'kot-stations', label: 'KOT Stations',   icon: 'print' },
      { path: 'kds',          label: 'Kitchen Display',icon: 'flame' },
    ],
  },
  {
    id: 'online',
    label: 'Online & Delivery',
    icon: 'truck',
    defaultOpen: false,
    links: [
      { path: 'aggregators',    label: 'Aggregators',     icon: 'globe' },
      { path: 'delivery-zones', label: 'Delivery Zones',  icon: 'truck' },
      { path: 'online-orders',  label: 'Online Orders',   icon: 'receipt' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'chart',
    defaultOpen: false,
    links: [
      { path: 'reports/sales',       label: 'Sales Report',      icon: 'chart' },
      { path: 'reports/products',    label: 'Product Mix',       icon: 'chart' },
      { path: 'reports/hourly',      label: 'Hourly Sales',      icon: 'chart' },
      { path: 'reports/discounts',   label: 'Discount Usage',    icon: 'coins' },
      { path: 'reports/tax',         label: 'Tax Summary',       icon: 'tag' },
      { path: 'reports/wastage',     label: 'Wastage Report',    icon: 'trash' },
      { path: 'reports/cashier',     label: 'Cashier Report',    icon: 'user' },
    ],
  },
  {
    id: 'inv',
    label: 'Inventory Management',
    icon: 'layers',
    defaultOpen: false,
    links: [
      { path: 'warehouses',       label: 'Warehouses',        icon: 'store' },
      { path: 'rm-categories',    label: 'RM Categories',     icon: 'list' },
      { path: 'uom',              label: 'Units of Measure',  icon: 'tag' },
      { path: 'ingredients',      label: 'Ingredients',       icon: 'bag' },
      { path: 'recipes',          label: 'Recipes',           icon: 'edit' },
      { path: 'suppliers',        label: 'Suppliers',         icon: 'truck' },
      { path: 'purchase-orders',  label: 'Purchase Orders',   icon: 'receipt' },
      { path: 'grns',             label: 'Goods Receipts',    icon: 'receipt' },
      { path: 'stock-adjustments',label: 'Stock Adjustments', icon: 'edit' },
      { path: 'stock-transfers',  label: 'Stock Transfers',   icon: 'arrow' },
      { path: 'indents',          label: 'Indents',           icon: 'plus' },
      { path: 'production',       label: 'Production Batches',icon: 'flame' },
      { path: 'wastage',          label: 'Wastage',           icon: 'trash' },
    ],
  },
  {
    id: 'acct',
    label: 'Accounting',
    icon: 'coins',
    defaultOpen: false,
    links: [
      { path: 'accounts',           label: 'Chart of Accounts', icon: 'chart' },
      { path: 'expense-categories', label: 'Expense Categories',icon: 'list' },
      { path: 'expenses',           label: 'Expenses',          icon: 'coins' },
      { path: 'vendor-bills',       label: 'Vendor Bills',      icon: 'receipt' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Loyalty',
    icon: 'star',
    defaultOpen: false,
    links: [
      { path: 'customers',         label: 'Customers',        icon: 'user' },
      { path: 'customer-groups',   label: 'Customer Groups',  icon: 'group' },
      { path: 'segments',          label: 'Segments',         icon: 'layers' },
      { path: 'loyalty',           label: 'Loyalty Tiers',    icon: 'star' },
      { path: 'coupons',           label: 'Coupons',          icon: 'tag' },
      { path: 'feedback',          label: 'Feedback',         icon: 'phone' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'bell',
    defaultOpen: false,
    links: [
      { path: 'wa-templates',      label: 'WhatsApp Templates', icon: 'phone' },
      { path: 'campaigns',         label: 'Campaigns',          icon: 'bell' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'shield',
    defaultOpen: false,
    links: [
      { path: 'users',    label: 'Staff',       icon: 'user' },
      { path: 'sales',    label: 'Bill History', icon: 'receipt' },
      { path: 'logs',     label: 'Audit Log',   icon: 'history' },
      { path: 'settings', label: 'Settings',    icon: 'shield' },
      { path: 'store',    label: 'Outlet Info', icon: 'store' },
    ],
  },
];
/* -------------------------------------------------------------------------- */
/* Top bar - hamburger, outlet chip, global search, quick actions, alerts     */
/* -------------------------------------------------------------------------- */

interface TopBarProps {
  readonly outletName: string;
  readonly outletTag?: string;         // e.g. "BENGALURU / DINE-IN"
  readonly collapsed: boolean;
  readonly onToggleSidebar: () => void;
  readonly onQuickAdd?: () => void;
  readonly notificationCount?: number;
  readonly extra?: ReactNode;          // user menu comes in here
}

export const TopBar: FC<TopBarProps> = ({
  outletName, outletTag, collapsed, onToggleSidebar, onQuickAdd,
  notificationCount = 0, extra,
}) => (
  <header className={cls.topbar}>
    <button
      type="button"
      className={cls.topbar__toggle}
      onClick={onToggleSidebar}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <Icon name={collapsed ? 'arrow' : 'menu'} size={18} />
    </button>

    <div className={cls.topbar__outlet} title={outletName}>
      <span className={cls['topbar__outlet-dot']} aria-hidden />
      <span className={cls['topbar__outlet-name']}>{outletName}</span>
      {outletTag && <span className={cls['topbar__outlet-tag']}>{outletTag}</span>}
    </div>

    <div className={cls.topbar__search}>
      <span className={cls['topbar__search-icon']}>
        <Icon name="search" size={15} />
      </span>
      <input
        type="search"
        className={cls['topbar__search-input']}
        placeholder="Search bills, items, customers..."
        aria-label="Global search"
      />
      <span className={cls['topbar__search-kbd']}>Ctrl K</span>
    </div>

    <div className={cls.topbar__spacer} />

    <div className={cls.topbar__actions}>
      {onQuickAdd && (
        <button type="button" className={cls.topbar__cta} onClick={onQuickAdd}>
          <Icon name="plus" size={14} />
          <span>New Sale</span>
        </button>
      )}
      <button
        type="button"
        className={cls.topbar__iconbtn}
        aria-label={`Notifications${notificationCount ? ` (${notificationCount})` : ''}`}
        title="Notifications"
      >
        <Icon name="bell" size={17} />
        {notificationCount > 0 && (
          <span className={cls['topbar__iconbtn-badge']}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>
      <span className={cls.topbar__divider} />
      <ThemeToggle />
      {extra}
    </div>
  </header>
);

/* -------------------------------------------------------------------------- */
/* AdminShell - hosts sidebar + top-bar. Owns the collapsed state.            */
/* -------------------------------------------------------------------------- */

const COLLAPSED_KEY = 'admin-sidebar-collapsed';

interface AdminShellProps {
  readonly slug: string;
  readonly outletName: string;
  readonly outletTag?: string;
  readonly onQuickAdd?: () => void;
  readonly notificationCount?: number;
  readonly topbar?: ReactNode;  // user-menu + any tenant-specific chip
}

export const AdminShell: FC<AdminShellProps> = ({
  slug, outletName, outletTag, onQuickAdd, notificationCount, topbar,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <div className={cls.adminShell}>
            <AdminSidebar slug={slug} collapsed={collapsed} groups={SIDEBAR_GROUPS} />
      <div className={cls.adminShell__main}>
        <TopBar
          outletName={outletName}
          outletTag={outletTag}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onQuickAdd={onQuickAdd}
          notificationCount={notificationCount ?? 0}
          extra={topbar}
        />
        <div className={cls.adminShell__content}>
          <Outlet />
        </div>
      </div>
      <ToastStack />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* AdminPage - shared header + intro + actions envelope                       */
/* -------------------------------------------------------------------------- */
/* AdminPage - shared header + intro + actions envelope                       */
/* Breadcrumbs are auto-derived from the current URL:                         */
/*   [HOME] > [Group (clickable)] > [Current page]                            */
/* Falls back to the passed `breadcrumb` prop if the URL doesn't match any    */
/* known SIDEBAR_GROUPS entry.                                                */
/* -------------------------------------------------------------------------- */

interface AdminPageProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumb?: readonly string[];   // fallback only
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

interface Crumb {
  readonly label: string;
  readonly to?: string;
}

/** Given the current admin path (after `/admin/`), find the matching group
 *  and return [group crumb, current-page crumb] with proper links. */
const deriveCrumbs = (slug: string, adminPath: string): readonly Crumb[] | null => {
  const cleanPath = adminPath.replace(/^\/+/, '');
  for (const group of SIDEBAR_GROUPS) {
    const link = group.links.find((l) => l.path === cleanPath);
    if (link) {
      // First link in the group is the group's landing page.
      const firstLink = group.links[0]!;
      return [
        { label: group.label, to: `/${slug}/admin/${firstLink.path}` },
        { label: link.label },
      ];
    }
  }
  return null;
};

export const AdminPage: FC<AdminPageProps> = ({
  title, subtitle, breadcrumb, actions, children,
}) => {
  const location = useLocation();
  const { slug = '' } = useParams<{ slug: string }>();

  // Extract the part after `/<slug>/admin/` for auto-crumbs.
  const adminIdx = location.pathname.indexOf('/admin/');
  const adminPath = adminIdx >= 0 ? location.pathname.slice(adminIdx + '/admin/'.length) : '';
  const autoCrumbs = deriveCrumbs(slug, adminPath);

  // Fall back to the string-array API when we can't derive from URL (e.g.
  // dashboard root, custom sub-routes).
  const crumbs: readonly Crumb[] =
    autoCrumbs
      ?? (breadcrumb ?? []).map((label) => ({ label }));

  return (
    <div>
      <div className={cls.adminPage__header}>
        <div className={cls.adminPage__intro}>
          {(crumbs.length > 0 || slug) && (
            <nav className={cls.adminPage__breadcrumb} aria-label="Breadcrumb">
              <Link to={`/${slug}/admin`} className={cls['adminPage__breadcrumb-home']} aria-label="Admin home">
                <Icon name="store" size={12} />
              </Link>
              {crumbs.map((c, idx) => (
                <span key={`${c.label}-${idx}`} className={cls['adminPage__breadcrumb-item']}>
                  <Icon name="chevron" size={10} className={cls['adminPage__breadcrumb-sep']} />
                  {c.to ? (
                    <Link to={c.to} className={cls['adminPage__link']}>{c.label}</Link>
                  ) : (
                    <span className={cls['adminPage__breadcrumb-current']} aria-current="page">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <Text as="h1" size="2xl" weight="heavy">{title}</Text>
          {subtitle && <Text tone="subtle">{subtitle}</Text>}
        </div>
        {actions && <div className={cls.adminPage__actions}>{actions}</div>}
      </div>
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* StubPage - "coming in Phase X" placeholder                                 */
/* Used by scaffolded screens that don't have real CRUD yet.                  */
/* -------------------------------------------------------------------------- */

interface StubPageProps {
  readonly title: string;
  readonly icon?: string;
  readonly phase: string;
  readonly hint?: string;
}

export const StubPage: FC<StubPageProps> = ({ title, icon = 'spark', phase, hint }) => {
  const navigate = useNavigate();
  return (
    <AdminPage title={title} subtitle={`Placeholder screen - part of ${phase}.`}>
      <div className={cls.adminPage__stub}>
        <div className={cls['adminPage__stub-icon']}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Icon name={icon as any} size={26} />
        </div>
        <Text as="h3" size="lg" weight="semibold">Coming soon</Text>
        <Text tone="subtle">
          {hint ?? `Table structure and seed data are in place. Detailed CRUD UI will land in ${phase}.`}
        </Text>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => navigate(-1)} className={cls.topbar__iconbtn} style={{ width: 'auto', padding: '8px 14px' }}>
            <Icon name="arrow" size={14} flipX /> Back
          </button>
        </div>
      </div>
    </AdminPage>
  );
};

// Re-export CrudPage helper so consumers only import from @billing/ui/admin.
export * from './CrudPage';
