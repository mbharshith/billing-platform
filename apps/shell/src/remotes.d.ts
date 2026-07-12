/**
 * Module Federation remote declarations.
 * Every `import(...)` from a remote is a virtual module - TypeScript needs
 * to be told they exist. Signatures MUST match what the remote actually
 * exposes in its vite.config.ts `exposes` block.
 */
declare module 'posApp/CashierApp' {
  import type { FC } from 'react';
  const CashierApp: FC;
  export default CashierApp;
  export { CashierApp };
}
declare module 'posApp/AdminApp' {
  import type { FC } from 'react';
  const AdminApp: FC;
  export default AdminApp;
  export { AdminApp };
}
declare module 'storefrontApp/StorefrontApp' {
  import type { FC } from 'react';
  const StorefrontApp: FC;
  export default StorefrontApp;
  export { StorefrontApp };
}
