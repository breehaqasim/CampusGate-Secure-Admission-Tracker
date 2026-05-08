import { supabase } from "../../lib/supabase";

function isMissingCurrencyColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('currency');
}

function toReadableUniversityError(error: any): Error {
  const rawMessage = error?.message || 'University request failed';
  const message = String(rawMessage).toLowerCase();

  if (message.includes('row-level security policy')) {
    return new Error(
      'Action blocked by Supabase RLS on universities. Log in as an approved university admin and add proper universities RLS policies.'
    );
  }

  return new Error(rawMessage);
}

export async function getUniversities(search = '', country = '', city = '') {
  let query = supabase.from('universities').select('*').order('created_at', {
    ascending: false,
  });

  if (search) query = query.ilike('name', `%${search}%`);
  if (country) query = query.ilike('country', `%${country}%`);
  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query;

  if (error) throw toReadableUniversityError(error);
  return data;
}

export async function getUniversityById(id: string) {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw toReadableUniversityError(error);
  return data;
}

export async function addUniversity(university: any) {
  const { data: sessionData } = await supabase.auth.getUser();
  const payload = {
    ...university,
    created_by: sessionData.user?.id,
  };

  const { error } = await supabase.from('universities').insert(payload);

  if (!error) return;

  if (isMissingCurrencyColumnError(error)) {
    const { currency, ...fallbackPayload } = payload;
    const { error: fallbackError } = await supabase
      .from('universities')
      .insert(fallbackPayload);
    if (fallbackError) throw toReadableUniversityError(fallbackError);
    return;
  }

  throw toReadableUniversityError(error);
}

export async function updateUniversity(id: string, university: any) {
  const { error } = await supabase
    .from('universities')
    .update(university)
    .eq('id', id);

  if (!error) return;

  if (isMissingCurrencyColumnError(error)) {
    const { currency, ...fallbackPayload } = university;
    const { error: fallbackError } = await supabase
      .from('universities')
      .update(fallbackPayload)
      .eq('id', id);
    if (fallbackError) throw toReadableUniversityError(fallbackError);
    return;
  }

  throw toReadableUniversityError(error);
}

export async function deleteUniversity(id: string) {
  const { data, error } = await supabase
    .from('universities')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw toReadableUniversityError(error);

  if (!data) {
    throw new Error('Delete failed: university not found or permission denied by RLS policy.');
  }

  return data.id;
}