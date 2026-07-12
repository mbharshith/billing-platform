// AdminSidebar + AdminShell + AdminPage template — TMBill-style vertical sidebar with phase groups, collapsible state via localStorage.

import { useEffect, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import cls from './admin.module.css';
import { Icon, Text, ThemeToggle } from '@billing/ui/atoms';
import { BRAND } from '@billing/shared/brand';
import { ToastStack } from '@billing/ui/feedback';

/* -------------------------------------------------------------------------- */
/* Sidebar config - 16 top-level TMBill sections grouped by phase.            */
/* Icon names are Icon-atom keys; paths are relative to /:slug/admin/         */
/* -------------------------------------------------------------------------- */

export interface SidebarLink {
  readonly path: string;             // relative to /:slug/admin
  readonly label: string;
  readonly icon: string;             // Icon atom name
}

export interface SidebarGroup {
  readonly id: string;
  readonly label: string;
  readonly links: readonly SidebarLink[];
}

export const SIDEBAR_GROUPS: readonly SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    links: [
      { path: '',              label: 'Dashboard',       icon: 'chart' },
      { path: 'live-orders',   label: 'Live Orders',     icon: 'receipt' },
    ],
  },
  {
    id: 'pos',
    label: 'POS Configuration',
    links: [
      { path: 'markets',           label: 'Markets',            icon: 'store' },
      { path: 'brands',            label: 'Brands',             icon: 'spark' },
      { path: 'outlets',           label: 'Outlets',            icon: 'store' },
      { path: 'payment-modes',     label: 'Payment Modes',      icon: 'card' },
      { path: 'order-types',       label: 'Order Types',        icon: 'bag' },
      { path: 'tax-slabs',         label: 'Tax Slabs',          icon: 'chart' },
      { path: 'discounts',         label: 'Discounts',          icon: 'coins' },
      { path: 'charges',           label: 'Additional Charges', icon: 'plus' },
      { path: 'reasons',           label: 'Reason Master',      icon: 'shield' },
      { path: 'outlet-settings',   label: 'Print & Terminal',   icon: 'print' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu Management',
    links: [
      { path: 'menu-categories', label: 'Categories',   icon: 'bag' },
      { path: 'products',        label: 'Menu Items',   icon: 'bag' },
      { path: 'modifiers',       label: 'Modifiers',    icon: 'plus' },
      { path: 'combos',          label: 'Combos',       icon: 'spark' },
      { path: 'variants',        label: 'Variants',     icon: 'edit' },
    ],
  },
  {
    id: 'tables',
    label: 'Tables & KDS',
    links: [
      { path: 'sections',     label: 'Floor Sections', icon: 'store' },
      { path: 'tables',       label: 'Tables',         icon: 'store' },
      { path: 'kot-stations', label: 'KOT Stations',   icon: 'print' },
      { path: 'kds',          label: 'Kitchen Display',icon: 'zap' },
    ],
  },
  {
    id: 'online',
    label: 'Online & Delivery',
    links: [
      { path: 'aggregators',    label: 'Aggregators',     icon: 'zap' },
      { path: 'delivery-zones', label: 'Delivery Zones',  icon: 'phone' },
      { path: 'online-orders',  label: 'Online Orders',   icon: 'receipt' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    links: [
      { path: 'reports/sales',       label: 'Sales Report',      icon: 'chart' },
      { path: 'reports/products',    label: 'Product Mix',       icon: 'chart' },
      { path: 'reports/hourly',      label: 'Hourly Sales',      icon: 'chart' },
      { path: 'reports/discounts',   label: 'Discount Usage',    icon: 'chart' },
      { path: 'reports/tax',         label: 'Tax Summary',       icon: 'chart' },
      { path: 'reports/wastage',     label: 'Wastage Report',    icon: 'chart' },
      { path: 'reports/cashier',     label: 'Cashier Report',    icon: 'chart' },
    ],
  },
  {
    id: 'inv',
    label: 'Inventory Management',
    links: [
      { path: 'warehouses',       label: 'Warehouses',       icon: 'store' },
      { path: 'rm-categories',    label: 'RM Categories',    icon: 'bag' },
      { path: 'uom',              label: 'Units of Measure', icon: 'chart' },
      { path: 'ingredients',      label: 'Ingredients',      icon: 'bag' },
      { path: 'recipes',          label: 'Recipes',          icon: 'edit' },
      { path: 'suppliers',        label: 'Suppliers',        icon: 'user' },
      { path: 'purchase-orders',  label: 'Purchase Orders',  icon: 'receipt' },
      { path: 'grns',             label: 'Goods Receipts',   icon: 'receipt' },
      { path: 'stock-adjustments',label: 'Stock Adjustments',icon: 'edit' },
      { path: 'stock-transfers',  label: 'Stock Transfers',  icon: 'zap' },
      { path: 'indents',          label: 'Indents',          icon: 'plus' },
      { path: 'production',       label: 'Production Batches',icon: 'spark' },
      { path: 'wastage',          label: 'Wastage',          icon: 'trash' },
    ],
  },
  {
    id: 'acct',
    label: 'Accounting',
    links: [
      { path: 'accounts',           label: 'Chart of Accounts', icon: 'chart' },
      { path: 'expense-categories', label: 'Expense Categories',icon: 'bag' },
      { path: 'expenses',           label: 'Expenses',          icon: 'coins' },
      { path: 'vendor-bills',       label: 'Vendor Bills',      icon: 'receipt' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Loyalty',
    links: [
      { path: 'customers',         label: 'Customers',        icon: 'user' },
      { path: 'customer-groups',   label: 'Customer Groups',  icon: 'user' },
      { path: 'segments',          label: 'Segments',         icon: 'spark' },
      { path: 'loyalty',           label: 'Loyalty Tiers',    icon: 'spark' },
      { path: 'coupons',           label: 'Coupons',          icon: 'coins' },
      { path: 'feedback',          label: 'Feedback',         icon: 'phone' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    links: [
      { path: 'wa-templates',      label: 'WhatsApp Templates', icon: 'phone' },
      { path: 'campaigns',         label: 'Campaigns',          icon: 'zap' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    links: [
      { path: 'users',    label: 'Staff',       icon: 'user' },
      { path: 'sales',    label: 'Bill History', icon: 'receipt' },
      { path: 'logs',     label: 'Audit Log',   icon: 'shield' },
      { path: 'settings', label: 'Settings',    icon: 'shield' },
      { path: 'store',    label: 'Outlet Info', icon: 'store' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* AdminSidebar - controlled component (collapse state lives in shell)        */
/* -------------------------------------------------------------------------- */

interface AdminSidebarProps {
  readonly slug: string;
  readonly collapsed: boolean;
}

export const AdminSidebar: FC<AdminSidebarProps> = ({ slug, collapsed }) => (
  <aside className={cls.sidebar} data-collapsed={collapsed} aria-label="Admin navigation">
    <div className={cls.sidebar__brand}>
      <Icon name="spark" size={22} />
      {!collapsed && (
        <div className={cls['sidebar__brand-text']}>
          <Text as="span" size="sm" weight="heavy">{BRAND.name}</Text>
          <Text as="span" size="xs" tone="subtle">Admin Console</Text>
        </div>
      )}
    </div>

    {SIDEBAR_GROUPS.map((group) => (
      <div key={group.id} className={cls.sidebar__group} data-group={group.id}>
        <div className={cls['sidebar__group-header']}>
          <span className={cls['sidebar__group-dot']} aria-hidden />
          <span>{group.label}</span>
        </div>
        {group.links.map((link) => (
          <NavLink
            key={link.path}
            to={`/${slug}/admin/${link.path}`}
            end={link.path === ''}
            data-label={link.label}   /* fed to the collapsed-mode flyout tooltip */
            className={({ isActive }) => [
              cls.sidebar__link,
              isActive && cls['sidebar__link--active'],
            ].filter(Boolean).join(' ')}
            title={link.label}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Icon name={link.icon as any} size={16} />
            <span className={cls['sidebar__link-label']}>{link.label}</span>
          </NavLink>
        ))}
      </div>
    ))}

    <div className={cls.sidebar__footer}>
      <span className={cls['sidebar__footer-hint']}>v11.7  KartWise</span>
    </div>
  </aside>
);

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
      <AdminSidebar slug={slug} collapsed={collapsed} />
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

interface AdminPageProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumb?: readonly string[];
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export const AdminPage: FC<AdminPageProps> = ({
  title, subtitle, breadcrumb, actions, children,
}) => (
  <div>
    <div className={cls.adminPage__header}>
      <div className={cls.adminPage__intro}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className={cls.adminPage__breadcrumb}>
            {breadcrumb.map((crumb, idx) => (
              <span key={crumb}>
                {idx > 0 && <span aria-hidden> / </span>}
                {crumb}
              </span>
            ))}
          </div>
        )}
        <Text as="h1" size="2xl" weight="heavy">{title}</Text>
        {subtitle && <Text tone="subtle">{subtitle}</Text>}
      </div>
      {actions && <div className={cls.adminPage__actions}>{actions}</div>}
    </div>
    {children}
  </div>
);

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
