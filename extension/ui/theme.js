// Apply the saved theme before first paint (classic script in <head>, avoids a flash).
// "system" (no data-theme attribute) follows the OS via prefers-color-scheme.
try {
  const saved = localStorage.getItem('arys-theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {
  // storage unavailable: follow the OS setting
}
