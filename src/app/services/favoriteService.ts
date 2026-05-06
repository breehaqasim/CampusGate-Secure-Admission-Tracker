import { supabase } from "../../lib/supabase";

export async function getFavorites() {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('favorites')
    .select('id, university_id, universities(*)')
    .eq('student_id', userData.user?.id);

  if (error) throw error;
  return data;
}

export async function addFavorite(universityId: string) {
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from('favorites').insert({
    student_id: userData.user?.id,
    university_id: universityId,
  });

  if (error) throw error;
}

export async function removeFavorite(universityId: string) {
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('student_id', userData.user?.id)
    .eq('university_id', universityId);

  if (error) throw error;
}