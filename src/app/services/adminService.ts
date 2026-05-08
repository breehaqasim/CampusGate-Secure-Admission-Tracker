import { supabase } from "../../lib/supabase";

function isMissingColumnError(error: any, columnName: string) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(columnName.toLowerCase());
}

function toReadableAdminError(error: any): Error {
  const raw = error?.message || 'Admin action failed';
  const message = String(raw).toLowerCase();

  if (message.includes('row-level security policy')) {
    return new Error('Action blocked by Supabase RLS policy. Allow Super Admin to update profiles and insert/select universities.');
  }

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return new Error('Network error while contacting Supabase. Please retry in a few seconds.');
  }

  return new Error(raw);
}

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
  let profile: any = null;

  const profileWithLocation = await supabase
    .from('profiles')
    .select('id, role, full_name, university_name, university_city, university_country')
    .eq('id', id)
    .single();

  if (profileWithLocation.error) {
    if (
      isMissingColumnError(profileWithLocation.error, 'university_city') ||
      isMissingColumnError(profileWithLocation.error, 'university_country')
    ) {
      const profileWithoutLocation = await supabase
        .from('profiles')
        .select('id, role, full_name, university_name')
        .eq('id', id)
        .single();
      if (profileWithoutLocation.error) throw toReadableAdminError(profileWithoutLocation.error);
      profile = profileWithoutLocation.data;
    } else {
      throw toReadableAdminError(profileWithLocation.error);
    }
  } else {
    profile = profileWithLocation.data;
  }

  if (profile?.role !== 'university-admin') {
    throw new Error('Only university-admin requests can be approved.');
  }

  const universityName = String(profile?.university_name || '').trim();
  if (!universityName) {
    throw new Error('Cannot approve admin: university name is missing on profile.');
  }

  // Ensure a university row exists for this admin.
  let universityId: string | null = null;

  const { data: createdByMatch, error: createdByMatchError } = await supabase
    .from('universities')
    .select('id')
    .eq('created_by', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (createdByMatchError) throw toReadableAdminError(createdByMatchError);
  if (createdByMatch?.id) {
    universityId = createdByMatch.id;
  } else {
    const { data: nameMatch, error: nameMatchError } = await supabase
      .from('universities')
      .select('id')
      .ilike('name', universityName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nameMatchError) throw toReadableAdminError(nameMatchError);

    if (nameMatch?.id) {
      universityId = nameMatch.id;
    } else {
      const { data: insertedUniversity, error: insertUniversityError } = await supabase
        .from('universities')
        .insert({
          name: universityName,
          country: String(profile?.university_country || '').trim() || 'Not specified',
          city: String(profile?.university_city || '').trim() || 'Not specified',
          type: 'Not specified',
          sat_score: '0',
          cost: 'USD 0',
          created_by: id,
          features: `Auto-created on admin approval for ${profile?.full_name || 'university admin'}.`,
          programs: [],
        })
        .select('id')
        .single();

      if (insertUniversityError) throw toReadableAdminError(insertUniversityError);
      universityId = insertedUniversity.id;
    }
  }

  const updateWithUniversityId = await supabase
    .from('profiles')
    .update({ approved: true, university_id: universityId })
    .eq('id', id);

  if (updateWithUniversityId.error) {
    if (isMissingColumnError(updateWithUniversityId.error, 'university_id')) {
      const { error: fallbackApproveError } = await supabase
        .from('profiles')
        .update({ approved: true })
        .eq('id', id);
      if (fallbackApproveError) throw toReadableAdminError(fallbackApproveError);
      return;
    }

    throw toReadableAdminError(updateWithUniversityId.error);
  }

}

export async function rejectAdmin(id: string) {
  // Mark as rejected so it disappears from pending approvals but keeps audit context.
  // Pending query uses approved=false, so approved=null is treated as rejected.
  const { error } = await supabase
    .from('profiles')
    .update({ approved: null })
    .eq('id', id)
    .eq('role', 'university-admin');

  if (error) throw toReadableAdminError(error);
}