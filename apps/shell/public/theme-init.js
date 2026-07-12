// Theme-init: runs synchronously before first paint so there is no flash.
// Kept in a separate file so the CSP can use script-src 'self' without
// needing 'unsafe-inline'. Must stay tiny — it blocks HTML parsing.
(function () {
  try {
    var stored = localStorage.getItem('app-theme');
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'dark' || stored === 'light' ? stored : dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
})();
