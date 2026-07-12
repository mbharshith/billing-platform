// Federation entry: the shell imports CashierApp via `posApp/CashierApp`. Shim for clean Rollup code-splitting.
export { CashierApp as default, CashierApp } from './CounterApp';
