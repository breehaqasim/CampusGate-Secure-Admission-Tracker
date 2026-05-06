import { supabase } from "../../lib/supabase";

export async function getPendingAdminRequests() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'university-admin')
    .eq('approved', false);

  if (error) throw error;
  return data;
}

export async function approveAdmin(id: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('id', id);

  if (error) throw error;
}

export async function rejectAdmin(id: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}