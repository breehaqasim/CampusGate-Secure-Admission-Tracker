import { supabase } from "../../lib/supabase";
import { validateStrongPassword } from "./passwordPolicy";

/** True when the URL hash is from a Supabase password recovery email (before client strips it). */
export function isPasswordRecoveryHash(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return false;
  try {
    const decoded = decodeURIComponent(raw);
    const fromDecoded = new URLSearchParams(decoded).get("type");
    if (fromDecoded === "recovery") return true;
    return new URLSearchParams(raw).get("type") === "recovery";
  } catch {
    return raw.includes("type=recovery") || raw.includes("type%3Drecovery");
  }
}

/** Minimal normalization for auth payloads (no strict validation). */
export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

/** Matches profile role storage variants (snake_case, casing) against portal constants. */
function normalizeProfileRole(role: string | null | undefined): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

export type PortalRole = "student" | "university-admin" | "super-admin";

async function loadProfileAfterSignIn(
  userId: string,
  normalizedEmail: string,
  authUser: { email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<any> {
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut({ scope: "global" });
    throw passThroughError(profileError);
  }

  if (!profile) {
    const metadata = authUser.user_metadata || {};
    const role = (metadata.role as string) || "student";

    const { error: createProfileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: (metadata.full_name as string) || "",
        email: authUser.email || normalizedEmail,
        role,
        university_name: (metadata.university_name as string | null) ?? null,
        approved:
          typeof metadata.approved === "boolean"
            ? metadata.approved
            : role === "student",
      },
      { onConflict: "id" }
    );

    if (createProfileError) {
      await supabase.auth.signOut({ scope: "global" });
      throw passThroughError(createProfileError);
    }

    const { data: newProfile, error: newProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (newProfileError) {
      await supabase.auth.signOut({ scope: "global" });
      throw passThroughError(newProfileError);
    }

    profile = newProfile;
  }

  return profile;
}

async function enforcePortalAccess(profile: any, expectedRole?: PortalRole): Promise<void> {
  if (expectedRole && normalizeProfileRole(profile.role) !== normalizeProfileRole(expectedRole)) {
    await supabase.auth.signOut({ scope: "global" });
    throw new Error("Access denied. This account is not allowed to sign in from this portal.");
  }

  const role = normalizeProfileRole(profile.role);
  if (role === "university-admin") {
    if (profile.approved === null) {
      await supabase.auth.signOut({ scope: "global" });
      throw new Error("Your admin request has been rejected by Super Admin.");
    }
    if (profile.approved === false) {
      await supabase.auth.signOut({ scope: "global" });
      throw new Error("Your admin request is pending approval from Super Admin.");
    }
  }
}

function otpRedirectTo(): string {
  return typeof window !== "undefined" ? `${window.location.origin}/` : "http://localhost:5173/";
}

/**
 * Step 1 of login: verify password + portal rules, then sign out and email an OTP.
 */
export async function loginWithPasswordAndSendEmailOtp(
  email: string,
  password: string,
  expectedRole: PortalRole
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) throw passThroughError(error);

  const profile = await loadProfileAfterSignIn(data.user.id, normalizedEmail, data.user);
  await enforcePortalAccess(profile, expectedRole);

  await supabase.auth.signOut({ scope: "global" });

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: otpRedirectTo(),
    },
  });
  if (otpError) throw passThroughError(otpError);
}

/** Step 2: verify email OTP and restore session. */
export async function completeLoginWithEmailOtp(
  email: string,
  otpToken: string,
  expectedRole: PortalRole
): Promise<any> {
  const normalizedEmail = normalizeEmail(email);
  const token = otpToken.trim().replace(/\s+/g, "");
  if (!token) {
    throw new Error("Enter the code from your email.");
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: "email",
  });
  if (error) throw passThroughError(error);
  if (!data.user) throw new Error("Verification failed.");

  const profile = await loadProfileAfterSignIn(data.user.id, normalizedEmail, data.user);
  await enforcePortalAccess(profile, expectedRole);
  return profile;
}

export async function resendLoginEmailOtp(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required.");

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: otpRedirectTo(),
    },
  });
  if (error) throw passThroughError(error);
}

function isMissingColumnError(error: any, columnName: string) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column") && message.includes(columnName.toLowerCase());
}

/** Pass through Supabase errors for easier debugging. */
function passThroughError(error: any): Error {
  if (error instanceof Error) return error;
  return new Error(String(error?.message || error || "Request failed"));
}

export async function signUpStudent(fullName: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!fullName.trim() || !normalizedEmail || !password) {
    throw new Error("Please fill all fields.");
  }

  const passwordIssue = validateStrongPassword(password);
  if (passwordIssue) {
    throw new Error(passwordIssue);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "student",
        approved: true,
      },
    },
  });

  if (error) throw passThroughError(error);
  if (!data.user) throw new Error("User was not created");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: fullName,
      email: normalizedEmail,
      role: "student",
      approved: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    const profileMessage = String(profileError.message || "").toLowerCase();
    const isRlsBlocked = profileMessage.includes("row-level security policy");
    if (!isRlsBlocked || data.session) {
      throw passThroughError(profileError);
    }
  }

  return data.user;
}

export async function requestUniversityAdmin(
  fullName: string,
  email: string,
  password: string,
  universityName: string,
  universityCity: string,
  universityCountry: string
) {
  const normalizedEmail = normalizeEmail(email);
  if (!fullName.trim() || !normalizedEmail || !password || !universityName.trim()) {
    throw new Error("Please fill all required fields.");
  }

  const passwordIssue = validateStrongPassword(password);
  if (passwordIssue) {
    throw new Error(passwordIssue);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "university-admin",
        university_name: universityName,
        university_city: universityCity,
        university_country: universityCountry,
        approved: false,
      },
    },
  });

  if (error) throw passThroughError(error);
  if (!data.user) throw new Error("User was not created");

  const profilePayload: any = {
    id: data.user.id,
    full_name: fullName,
    email: normalizedEmail,
    role: "university-admin",
    university_name: universityName,
    university_city: universityCity,
    university_country: universityCountry,
    approved: false,
  };

  let { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

  if (
    profileError &&
    (isMissingColumnError(profileError, "university_city") ||
      isMissingColumnError(profileError, "university_country"))
  ) {
    const { university_city, university_country, ...fallbackPayload } = profilePayload;
    const fallback = await supabase.from("profiles").upsert(fallbackPayload, { onConflict: "id" });
    profileError = fallback.error;
  }

  if (profileError) {
    const profileMessage = String(profileError.message || "").toLowerCase();
    const isRlsBlocked = profileMessage.includes("row-level security policy");
    if (!isRlsBlocked || data.session) {
      throw passThroughError(profileError);
    }
  }

  return data.user;
}

export async function loginUser(
  email: string,
  password: string,
  expectedRole?: PortalRole
) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw passThroughError(error);

  const profile = await loadProfileAfterSignIn(data.user.id, normalizedEmail, data.user);
  await enforcePortalAccess(profile, expectedRole);
  return profile;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw passThroughError(error);
}

/** Call while session was opened via PASSWORD_RECOVERY link (after updateUser, sign out on client). */
export async function updatePasswordAfterRecovery(newPassword: string) {
  const issue = validateStrongPassword(newPassword);
  if (issue) throw new Error(issue);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw passThroughError(error);

  await supabase.auth.signOut({ scope: "global" });
}

/** User-visible hint after resetPasswordForEmail succeeds (Supabase sends mail server-side). */
export function getPasswordResetSentGuidance(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  return [
    "If an account exists for that email, Supabase sent a recovery link.",
    "Wait a minute, then check inbox and spam/junk.",
    "",
    "If nothing arrives:",
    `• Supabase Dashboard → Authentication → URL Configuration: add "${origin}" (and Site URL) under Redirect URLs.`,
    "• Authentication → Users: confirm that email is registered.",
    "• Project Settings → Auth: enable Custom SMTP or check built-in email rate limits / logs.",
  ].join("\n");
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required.");

  // Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs (try with and without trailing slash).
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : "http://localhost:5173/";

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });
  if (error) throw passThroughError(error);
}
