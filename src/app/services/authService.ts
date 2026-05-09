import { supabase } from "../../lib/supabase";

/** Minimal normalization for auth payloads (no strict validation). */
export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
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

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw passThroughError(error);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) throw passThroughError(profileError);
  if (profile) return profile;

  const metadata = data.user.user_metadata || {};
  const role = metadata.role || "student";

  const { error: createProfileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: metadata.full_name || "",
      email: data.user.email || normalizedEmail,
      role,
      university_name: metadata.university_name || null,
      approved: typeof metadata.approved === "boolean" ? metadata.approved : role === "student",
    },
    { onConflict: "id" }
  );

  if (createProfileError) throw passThroughError(createProfileError);

  const { data: newProfile, error: newProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (newProfileError) throw passThroughError(newProfileError);

  return newProfile;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw passThroughError(error);
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required.");

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw passThroughError(error);
}
