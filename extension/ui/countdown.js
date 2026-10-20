// Live countdown for pages that are open and visible only: a setTimeout chain aligned to whole
// seconds, paused while the page is hidden. Nothing ever runs in the background.
export function startTicker(tick) {
  let timer = null;
  let stopped = false;
  const schedule = () => {
    clearTimeout(timer);
    if (stopped || document.hidden) return;
    tick(Date.now());
    if (!stopped) timer = setTimeout(schedule, 1000 - (Date.now() % 1000) + 5);
  };
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', schedule);
  };
}
