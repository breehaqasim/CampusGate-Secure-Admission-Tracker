/**
 * Client-side password rules for all roles (student, university admin, super admin).
 * Passwords are never stored in the app: Supabase Auth hashes them on the server
 * (bcrypt-based in GoTrue) when you call signUp / signInWithPassword.
 */

export const PASSWORD_MIN_LENGTH = 12;

export function getPasswordPolicyHint(): string {
  return `Use at least ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, a number, and a symbol.`;
}

/** @returns An error message if invalid; `null` if the password satisfies the policy. */
export function validateStrongPassword(password: string): string | null {
  const p = String(password || "");
  if (p.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (!/[a-z]/.test(p)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(p)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(p)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return "Password must include at least one special character (e.g. !@#$%).";
  }
  return null;
}
