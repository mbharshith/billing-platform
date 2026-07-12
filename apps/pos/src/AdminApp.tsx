// Federation entry: the shell imports this via `posApp/AdminApp`.
// Same file (CounterApp.tsx) drives both surfaces; two exposes keep the
// shell's lazy() imports clean and each remote module small.
export { AdminApp as default, AdminApp } from './CounterApp';
