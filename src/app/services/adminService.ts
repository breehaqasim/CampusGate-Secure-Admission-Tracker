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

async function fetchAdminProfileForApproval(id: string) {
  const profileWithLocation = await supabase
    .from('profiles')
    .select('id, role, full_name, university_name, university_city, university_country')
    .eq('id', id)
    .single();

  if (!profileWithLocation.error) {
    return profileWithLocation.data;
  }

  const err = profileWithLocation.error;
  const missingLocationCols =
    isMissingColumnError(err, 'university_city') || isMissingColumnError(err, 'university_country');
  if (!missingLocationCols) {
    throw toReadableAdminError(err);
  }

  const profileWithoutLocation = await supabase
    .from('profiles')
    .select('id, role, full_name, university_name')
    .eq('id', id)
    .single();

  if (profileWithoutLocation.error) throw toReadableAdminError(profileWithoutLocation.error);
  return profileWithoutLocation.data;
}

async function findOrCreateUniversityForAdmin(
  adminId: string,
  profile: Record<string, unknown>,
  universityName: string
): Promise<string> {
  const { data: createdByMatch, error: createdByMatchError } = await supabase
    .from('universities')
    .select('id')
    .eq('created_by', adminId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (createdByMatchError) throw toReadableAdminError(createdByMatchError);
  if (createdByMatch?.id) return createdByMatch.id;

  const { data: nameMatch, error: nameMatchError } = await supabase
    .from('universities')
    .select('id')
    .ilike('name', universityName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (nameMatchError) throw toReadableAdminError(nameMatchError);
  if (nameMatch?.id) return nameMatch.id;

  const fullName = typeof profile.full_name === 'string' ? profile.full_name : '';
  const { data: insertedUniversity, error: insertUniversityError } = await supabase
    .from('universities')
    .insert({
      name: universityName,
      country: String(profile.university_country || '').trim() || 'Not specified',
      city: String(profile.university_city || '').trim() || 'Not specified',
      type: 'Not specified',
      sat_score: '0',
      cost: 'USD 0',
      created_by: adminId,
      features: `Auto-created on admin approval for ${fullName || 'university admin'}.`,
      programs: [],
    })
    .select('id')
    .single();

  if (insertUniversityError) throw toReadableAdminError(insertUniversityError);
  return insertedUniversity.id;
}

async function setProfileApprovedWithUniversityId(id: string, universityId: string) {
  const updateWithUniversityId = await supabase
    .from('profiles')
    .update({ approved: true, university_id: universityId })
    .eq('id', id);

  if (!updateWithUniversityId.error) return;

  if (!isMissingColumnError(updateWithUniversityId.error, 'university_id')) {
    throw toReadableAdminError(updateWithUniversityId.error);
  }

  const { error: fallbackApproveError } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('id', id);

  if (fallbackApproveError) throw toReadableAdminError(fallbackApproveError);
}

export async function approveAdmin(id: string) {
  const profile = await fetchAdminProfileForApproval(id);

  if (profile?.role !== 'university-admin') {
    throw new Error('Only university-admin requests can be approved.');
  }

  const universityName = String(profile?.university_name || '').trim();
  if (!universityName) {
    throw new Error('Cannot approve admin: university name is missing on profile.');
  }

  const universityId = await findOrCreateUniversityForAdmin(id, profile, universityName);
  await setProfileApprovedWithUniversityId(id, universityId);
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