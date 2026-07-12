// @billing/shared - domain vocabulary + state + persistence for the platform.
//
// Barrel exports the most-imported symbols. Every module is ALSO reachable
// via its subpath export (see package.json "exports"). Prefer subpaths for
// code-split friendliness; only use the barrel when you legitimately need
// several symbols from different sub-modules.

export * from './domain/types';
export { BRAND } from './brand';
