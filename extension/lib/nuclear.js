// Nuclear option: a one-way lock on deleting entries. Pure functions, unit-tested.
//
// While locked (enabled and now < unlockAt - including before startsAt, so a scheduled lock cannot
// be dodged by deleting everything first): entries cannot be removed, the lock cannot be disabled,
// shortened or postponed. Adding entries and customising the block page stay allowed.
// Only absolute timestamps are stored; expiry needs no timer (computed from Date.now()).

/** Largest timestamp a JS Date can hold. Durations are clamped here, never rejected. */
export const MAX_TS = 8.64e15;
/** Unlock times this far away are shown as "∞". */
export const PERMANENT_MS = 100 * 365.25 * 24 * 60 * 60 * 1000;
export const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

export const DEFAULT_NUCLEAR = Object.freeze({ enabled: false, startsAt: 0, unlockAt: 0 });

/** Pure: coerce stored data into a valid nuclear state. */
export function normalizeNuclear(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v) => (Number.isFinite(v) && v > 0 ? Math.min(v, MAX_TS) : 0);
  const startsAt = num(r.startsAt);
  const unlockAt = num(r.unlockAt);
  const enabled = r.enabled === true && unlockAt > 0;
  return enabled ? { enabled, startsAt, unlockAt } : { ...DEFAULT_NUCLEAR };
}

export const isLocked = (n, now) => Boolean(n?.enabled) && now < n.unlockAt;
export const isActive = (n, now) => isLocked(n, now) && now >= n.startsAt;
export const isScheduled = (n, now) => isLocked(n, now) && now < n.startsAt;
export const isPermanent = (n, now) => isLocked(n, now) && n.unlockAt - now >= PERMANENT_MS;

/**
 * Pure: turn the form into absolute times.
 * @param {{ amount: number, unit: 'minutes'|'hours'|'days', startAt?: number|null }} form
 *   startAt: epoch ms of a scheduled start, or null/undefined for "now".
 * @returns {{ startsAt: number, unlockAt: number } | { error: 'amount' | 'start' }}
 */
export function planNuclear({ amount, unit, startAt = null }, now) {
  const ms = UNIT_MS[unit];
  if (!ms || !Number.isFinite(amount) || amount <= 0) return { error: 'amount' };
  const startsAt = startAt == null ? now : startAt;
  if (!Number.isFinite(startsAt) || startsAt < now - 60_000) return { error: 'start' };
  const unlockAt = Math.min(startsAt + amount * ms, MAX_TS);
  if (!(unlockAt > startsAt)) return { error: 'amount' };
  return { startsAt, unlockAt };
}

/**
 * Pure: may the nuclear state change from `prev` to `next` at `now`?
 * @returns {string | null} reason, or null when allowed
 */
export function nuclearChangeProblem(prev, next, now) {
  if (!isLocked(prev, now)) return null;
  if (!next.enabled) return 'locked-disable';
  if (next.unlockAt < prev.unlockAt) return 'locked-shorten';
  if (next.startsAt > prev.startsAt) return 'locked-postpone';
  return null;
}

/** Pure: split a duration into parts for display. */
export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/** Pure: "3d 04:05:06", "04:05:06" or "∞". */
export function formatCountdown(ms) {
  if (ms >= PERMANENT_MS) return '∞';
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days ? `${days}d ${clock}` : clock;
}
