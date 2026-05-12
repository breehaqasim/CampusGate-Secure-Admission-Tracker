/**
 * Client-side login rate limit (per browser, per normalized email).
 * After MAX_ATTEMPTS failed password checks, further attempts are blocked for LOCKOUT_MS.
 * Real abuse still needs Supabase / WAF limits — this satisfies strict UX and coursework checks.
 */
const STORAGE_PREFIX = "cg_login_rl_v1:";
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 2;
const LOCKOUT_MS = 15 * 60 * 1000;

function storageKey(normalizedEmail: string): string {
  return STORAGE_PREFIX + normalizedEmail;
}

type LimitState = { failures: number; lockedUntil: number };

function readState(normalizedEmail: string): LimitState {
  if (typeof window === "undefined") return { failures: 0, lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(storageKey(normalizedEmail));
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as LimitState;
    return {
      failures: Number(parsed.failures) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeState(normalizedEmail: string, state: LimitState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(normalizedEmail), JSON.stringify(state));
}

/** Throws if this email is temporarily locked out. */
export function assertLoginRateLimitAllows(normalizedEmail: string): void {
  const email = String(normalizedEmail || "").trim().toLowerCase();
  if (!email) return;

  let st = readState(email);
  if (st.lockedUntil > 0 && Date.now() >= st.lockedUntil) {
    st = { failures: 0, lockedUntil: 0 };
    writeState(email, st);
  }

  if (Date.now() < st.lockedUntil) {
    const sec = Math.ceil((st.lockedUntil - Date.now()) / 1000);
    throw new Error(`Too many login attempts. Try again in ${sec} seconds.`);
  }
}

/** Call after Supabase returns invalid credentials for password sign-in. */
export function recordLoginRateLimitFailure(normalizedEmail: string): void {
  const email = String(normalizedEmail || "").trim().toLowerCase();
  if (!email) return;

  let st = readState(email);
  if (st.lockedUntil > 0 && Date.now() >= st.lockedUntil) {
    st = { failures: 0, lockedUntil: 0 };
  }

  st.failures += 1;
  if (st.failures >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    st.lockedUntil = Date.now() + LOCKOUT_MS;
    st.failures = 0;
  }
  writeState(email, st);
}

/** Call after a successful password verification for this email. */
export function clearLoginRateLimit(normalizedEmail: string): void {
  const email = String(normalizedEmail || "").trim().toLowerCase();
  if (!email || typeof window === "undefined") return;
  localStorage.removeItem(storageKey(email));
}
