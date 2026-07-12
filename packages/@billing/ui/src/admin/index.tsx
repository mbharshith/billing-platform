// AdminSidebar + AdminShell + AdminPage template.
//
// Powers every admin surface: replaces the horizontal top-nav with a
// TMBill-style vertical sidebar grouped by phase (POS Config, Menu,
// Tables, Online, Reports, Inventory, CRM). Each group is
// collapsible and remembers state via localStorage.
//
// AdminPage is the shared header+toolbar+content shell every admin
// list/detail page renders inside. Keeps 60+ pages visually consistent
// without repeating markup.

import { useEffect, useState, type FC, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import cls from './admin.module.css';
import { Icon, Text, ThemeToggle } from '@billing/ui/atoms';
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
    label: 'Inventory',
    links: [
      { path: 'ingredients',      label: 'Ingredients',      icon: 'bag' },
      { path: 'recipes',          label: 'Recipes',          icon: 'edit' },
      { path: 'suppliers',        label: 'Suppliers',        icon: 'user' },
      { path: 'purchase-orders',  label: 'Purchase Orders',  icon: 'receipt' },
      { path: 'wastage',          label: 'Wastage',          icon: 'trash' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM & Loyalty',
    links: [
      { path: 'customers',         label: 'Customers',        icon: 'user' },
      { path: 'customer-groups',   label: 'Customer Groups',  icon: 'user' },
      { path: 'loyalty',           label: 'Loyalty Tiers',    icon: 'spark' },
      { path: 'coupons',           label: 'Coupons',          icon: 'coins' },
      { path: 'feedback',          label: 'Feedback',         icon: 'phone' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    links: [
      { path: 'users',    label: 'Staff',      icon: 'user' },
      { path: 'sales',    label: 'Bill History', icon: 'receipt' },
      { path: 'settings', label: 'Settings',   icon: 'shield' },
      { path: 'store',    label: 'Outlet Info', icon: 'store' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* AdminSidebar                                                               */
/* -------------------------------------------------------------------------- */

const COLLAPSED_KEY = 'admin-sidebar-collapsed';

interface AdminSidebarProps { slug: string }

export const AdminSidebar: FC<AdminSidebarProps> = ({ slug }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <aside className={cls.sidebar} data-collapsed={collapsed} aria-label="Admin navigation">
      <div className={cls.sidebar__brand}>
        <Icon name="spark" size={22} />
        {!collapsed && (
          <div className={cls['sidebar__brand-text']}>
            <Text as="span" size="sm" weight="heavy">KartWise</Text>
            <Text as="span" size="xs" tone="subtle">Admin Console</Text>
          </div>
        )}
      </div>

      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.id} className={cls.sidebar__group}>
          {!collapsed && (
            <div className={cls['sidebar__group-header']}>
              <span>{group.label}</span>
            </div>
          )}
          {group.links.map((link) => (
            <NavLink
              key={link.path}
              to={`/${slug}/admin/${link.path}`}
              end={link.path === ''}
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

      <button
        type="button"
        className={cls.sidebar__collapse}
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon name="arrow" size={14} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

/* -------------------------------------------------------------------------- */
/* AdminShell - top-level layout for admin routes                             */
/* -------------------------------------------------------------------------- */

interface AdminShellProps {
  readonly slug: string;
  readonly outletName: string;
  readonly topbar?: ReactNode;
}

export const AdminShell: FC<AdminShellProps> = ({ slug, outletName, topbar }) => (
  <div className={cls.adminShell}>
    <AdminSidebar slug={slug} />
    <div className={cls.adminShell__main}>
      <div className={cls.adminShell__topbar}>
        <Text weight="semibold">{outletName}</Text>
        <div className={cls['adminShell__topbar-spacer']} />
        {topbar}
        <ThemeToggle />
      </div>
      <div className={cls.adminShell__content}>
        <Outlet />
      </div>
    </div>
    <ToastStack />
  </div>
);

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
          <button type="button" onClick={() => navigate(-1)} className={cls.sidebar__collapse}>
            <Icon name="arrow" size={14} /> Back
          </button>
        </div>
      </div>
    </AdminPage>
  );
};

// Re-export CrudPage helper so consumers only import from @billing/ui/admin.
export * from './CrudPage';
