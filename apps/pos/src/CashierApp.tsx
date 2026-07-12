// Federation entry: the shell imports this via `posApp/CashierApp`.
// CounterApp.tsx already exports both CashierApp and AdminApp; this file
// is just the exposed-module shim so Rollup can code-split cleanly.
export { CashierApp as default, CashierApp } from './CounterApp';
