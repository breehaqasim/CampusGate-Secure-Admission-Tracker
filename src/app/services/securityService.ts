const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

interface RateLimitState {
  count: number;
  resetAt: number;
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function validateStrongPassword(password: string): string | null {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters long.';
  if (!UPPERCASE_REGEX.test(value)) return 'Password must include at least one uppercase letter.';
  if (!LOWERCASE_REGEX.test(value)) return 'Password must include at least one lowercase letter.';
  if (!NUMBER_REGEX.test(value)) return 'Password must include at least one number.';
  if (!SPECIAL_REGEX.test(value)) return 'Password must include at least one special character.';
  return null;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const storageKey = `security_rate_limit:${key}`;
  const raw = localStorage.getItem(storageKey);
  const parsed: RateLimitState | null = raw ? JSON.parse(raw) : null;

  if (!parsed || now >= parsed.resetAt) {
    const next: RateLimitState = { count: 1, resetAt: now + windowMs };
    localStorage.setItem(storageKey, JSON.stringify(next));
    return { allowed: true, retryAfterMs: 0 };
  }

  if (parsed.count >= limit) {
    return { allowed: false, retryAfterMs: parsed.resetAt - now };
  }

  const next: RateLimitState = { ...parsed, count: parsed.count + 1 };
  localStorage.setItem(storageKey, JSON.stringify(next));
  return { allowed: true, retryAfterMs: 0 };
}

