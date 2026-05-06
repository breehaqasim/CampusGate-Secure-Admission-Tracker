import { supabase } from "../../lib/supabase";

export async function getUniversities(search = '', country = '', city = '') {
  let query = supabase.from('universities').select('*').order('created_at', {
    ascending: false,
  });

  if (search) query = query.ilike('name', `%${search}%`);
  if (country) query = query.ilike('country', `%${country}%`);
  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getUniversityById(id: string) {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function addUniversity(university: any) {
  const { data: sessionData } = await supabase.auth.getUser();

  const { error } = await supabase.from('universities').insert({
    ...university,
    created_by: sessionData.user?.id,
  });

  if (error) throw error;
}

export async function updateUniversity(id: string, university: any) {
  const { error } = await supabase
    .from('universities')
    .update(university)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteUniversity(id: string) {
  const { error } = await supabase.from('universities').delete().eq('id', id);
  if (error) throw error;
}