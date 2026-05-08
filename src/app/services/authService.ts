import { supabase } from "../../lib/supabase";

function toReadableAuthError(error: any): Error {
  const rawMessage = error?.message || 'Authentication request failed';
  const message = String(rawMessage).toLowerCase();

  if (message.includes('already registered') || message.includes('already exists')) {
    return new Error('This email is already registered. Please log in instead.');
  }

  if (message.includes('password')) {
    return new Error('Password is too weak. Please use at least 6 characters.');
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
  const { data, error } = await supabase.auth.signUp({
    email,
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
    email,
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
  universityName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'university-admin',
        university_name: universityName,
        approved: false,
      },
    },
  });

  if (error) throw toReadableAuthError(error);
  if (!data.user) throw new Error('User was not created');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    email,
    role: 'university-admin',
    university_name: universityName,
    approved: false,
  }, { onConflict: 'id' });

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
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
    email: data.user.email || email,
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