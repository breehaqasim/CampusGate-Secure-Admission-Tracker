import { supabase } from "../../lib/supabase";
import { isValidEmail, normalizeEmail, validateStrongPassword } from './securityService';

function isNetworkFetchError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror');
}

async function signUpWithRetry(payload: any) {
  const firstAttempt = await supabase.auth.signUp(payload);
  if (!firstAttempt.error) return firstAttempt;
  if (!isNetworkFetchError(firstAttempt.error)) return firstAttempt;

  // Retry once for transient network or upstream hiccups.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return supabase.auth.signUp(payload);
}

function isMissingColumnError(error: any, columnName: string) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(columnName.toLowerCase());
}

function toReadableAuthError(error: any): Error {
  const rawMessage = error?.message || 'Authentication request failed';
  const message = String(rawMessage).toLowerCase();

  if (message.includes('already registered') || message.includes('already exists')) {
    return new Error('This email is already registered. Please log in instead.');
  }

  if (message.includes('password')) {
    return new Error('Password is too weak. Please use at least 6 characters.');
  }

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return new Error(
      'Could not reach Supabase right now (network/API issue). Please check your internet, disable strict ad-block/privacy extensions for localhost, and try again.'
    );
  }

  return new Error(rawMessage);
}

function toReadableProfileError(error: any): Error {
  const rawMessage = error?.message || 'Failed to create user profile';
  const message = String(rawMessage).toLowerCase();

  if (message.includes('profiles_id_fkey') || message.includes('foreign key')) {
    return new Error(
      'Account was created, but profile setup failed due to a database relation issue. In Supabase, set profiles.id to reference auth.users(id), then try again with a new email.'
    );
  }

  if (message.includes('row-level security policy')) {
    return new Error(
      'Account was created, but profile insert is blocked by Supabase RLS policy. Add an INSERT policy on profiles for authenticated users (auth.uid() = id).'
    );
  }

  return new Error(rawMessage);
}

export async function signUpStudent(
  fullName: string,
  email: string,
  password: string
) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  const passwordIssue = validateStrongPassword(password);
  if (passwordIssue) throw new Error(passwordIssue);

  // Password hashing is handled server-side by Supabase Auth (bcrypt/secure provider implementation).
  const { data, error } = await signUpWithRetry({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'student',
        approved: true,
      },
    },
  });

  if (error) throw toReadableAuthError(error);
  if (!data.user) throw new Error('User was not created');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    email: normalizedEmail,
    role: 'student',
    approved: true,
  }, { onConflict: 'id' });

  // When email confirmation is enabled, signUp may not create a session yet.
  // In that case RLS can block profile writes; profile will be created on first login.
  if (profileError) {
    const profileMessage = String(profileError.message || '').toLowerCase();
    const isRlsBlocked = profileMessage.includes('row-level security policy');
    if (!isRlsBlocked || data.session) {
      throw toReadableProfileError(profileError);
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
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  const passwordIssue = validateStrongPassword(password);
  if (passwordIssue) throw new Error(passwordIssue);

  const { data, error } = await signUpWithRetry({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'university-admin',
        university_name: universityName,
        university_city: universityCity,
        university_country: universityCountry,
        approved: false,
      },
    },
  });

  if (error) throw toReadableAuthError(error);
  if (!data.user) throw new Error('User was not created');

  const profilePayload: any = {
    id: data.user.id,
    full_name: fullName,
    email: normalizedEmail,
    role: 'university-admin',
    university_name: universityName,
    university_city: universityCity,
    university_country: universityCountry,
    approved: false,
  };

  let { error: profileError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  // Backward-compatible fallback when new location columns are not present yet.
  if (
    profileError &&
    (isMissingColumnError(profileError, 'university_city') ||
      isMissingColumnError(profileError, 'university_country'))
  ) {
    const { university_city, university_country, ...fallbackPayload } = profilePayload;
    const fallback = await supabase
      .from('profiles')
      .upsert(fallbackPayload, { onConflict: 'id' });
    profileError = fallback.error;
  }

  if (profileError) {
    const profileMessage = String(profileError.message || '').toLowerCase();
    const isRlsBlocked = profileMessage.includes('row-level security policy');
    if (!isRlsBlocked || data.session) {
      throw toReadableProfileError(profileError);
    }
  }

  return data.user;
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw toReadableAuthError(error);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) throw toReadableProfileError(profileError);
  if (profile) return profile;

  const metadata = data.user.user_metadata || {};
  const role = metadata.role || 'student';

  const { error: createProfileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: metadata.full_name || '',
    email: data.user.email || normalizedEmail,
    role,
    university_name: metadata.university_name || null,
    approved: typeof metadata.approved === 'boolean' ? metadata.approved : role === 'student',
  }, { onConflict: 'id' });

  if (createProfileError) throw toReadableProfileError(createProfileError);

  const { data: newProfile, error: newProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (newProfileError) throw toReadableProfileError(newProfileError);

  return newProfile;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw toReadableAuthError(error);
}

export async function sendEmailOtpForPrivilegedLogin(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw toReadableAuthError(error);
}

export async function verifyEmailOtpForPrivilegedLogin(
  email: string,
  otpToken: string,
  expectedRole: 'university-admin' | 'super-admin'
) {
  const normalizedEmail = normalizeEmail(email);
  const token = String(otpToken || '').trim();
  if (!token) throw new Error('OTP is required.');

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type: 'email',
  });

  if (error) throw toReadableAuthError(error);
  const userId = data.user?.id;
  if (!userId) throw new Error('OTP verification succeeded but no user session was created.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw toReadableProfileError(profileError);
  if (profile?.role !== expectedRole) {
    await supabase.auth.signOut();
    throw new Error('OTP verified, but role authorization failed.');
  }
}