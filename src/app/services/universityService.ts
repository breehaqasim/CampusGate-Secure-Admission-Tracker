import { supabase } from "../../lib/supabase";

function isMissingCurrencyColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('currency');
}

function isMissingUniversityIdColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('university_id');
}

function isMissingUniversityProgramsTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('could not find the table') && message.includes('university_programs');
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

export interface UniversityProgramInput {
  program_name: string;
  degree_type: string;
  duration: string;
  tuition_fee: string;
  minimum_sat_score: string;
  intake_semester: string;
  eligibility_requirements: string;
  program_description: string;
}

export interface UniversityProgram extends UniversityProgramInput {
  id: string;
  university_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getAdminUniversityContext() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error('No authenticated user found');

  let profile: any = null;
  let hasUniversityIdColumn = true;

  const profileWithUniversityId = await supabase
    .from('profiles')
    .select('id, full_name, role, university_id, university_name')
    .eq('id', userId)
    .single();

  if (profileWithUniversityId.error) {
    if (isMissingUniversityIdColumnError(profileWithUniversityId.error)) {
      hasUniversityIdColumn = false;
      const profileWithoutUniversityId = await supabase
        .from('profiles')
        .select('id, full_name, role, university_name')
        .eq('id', userId)
        .single();

      if (profileWithoutUniversityId.error) {
        throw toReadableUniversityError(profileWithoutUniversityId.error);
      }

      profile = profileWithoutUniversityId.data;
    } else {
      throw toReadableUniversityError(profileWithUniversityId.error);
    }
  } else {
    profile = profileWithUniversityId.data;
  }

  if (profile?.role !== 'university-admin') {
    throw new Error('Access denied. Only university admins can access this dashboard.');
  }

  let university: any = null;

  if (profile?.university_id) {
    const { data: uniById, error: uniByIdError } = await supabase
      .from('universities')
      .select('*')
      .eq('id', profile.university_id)
      .maybeSingle();

    if (uniByIdError) throw toReadableUniversityError(uniByIdError);
    university = uniById;
  } else if (profile?.university_name) {
    const { data: uniByName, error: uniByNameError } = await supabase
      .from('universities')
      .select('*')
      .ilike('name', profile.university_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (uniByNameError) throw toReadableUniversityError(uniByNameError);
    university = uniByName;

    // Backfill link when a matching university exists.
    if (hasUniversityIdColumn && uniByName?.id) {
      await supabase
        .from('profiles')
        .update({ university_id: uniByName.id })
        .eq('id', profile.id);
    }
  }

  if (!university) {
    // Legacy fallback: infer linked university from creator relationship.
    // This supports older data where profiles are not linked via university_id/university_name.
    const { data: uniByCreator, error: uniByCreatorError } = await supabase
      .from('universities')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (uniByCreatorError) throw toReadableUniversityError(uniByCreatorError);
    university = uniByCreator;
  }

  if (!university) {
    throw new Error(
      'No university is linked to this admin account yet. Set profiles.university_name to an existing university or link profiles.university_id during onboarding.'
    );
  }

  return {
    admin: profile,
    university,
  };
}

export async function getProgramsByUniversity(universityId: string) {
  const { data, error } = await supabase
    .from('university_programs')
    .select('*')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

  if (!error) return (data || []) as UniversityProgram[];

  if (!isMissingUniversityProgramsTableError(error)) {
    throw toReadableUniversityError(error);
  }

  // Backward-compatible fallback for projects that still store programs on universities.
  const { data: university, error: universityError } = await supabase
    .from('universities')
    .select('programs')
    .eq('id', universityId)
    .maybeSingle();

  if (universityError) throw toReadableUniversityError(universityError);

  const fallbackPrograms = Array.isArray(university?.programs) ? university.programs : [];
  return fallbackPrograms
    .map((entry: any, index: number) => {
      if (typeof entry === 'string') {
        try {
          const parsed = JSON.parse(entry);
          return {
            id: `legacy-${universityId}-${index}`,
            university_id: universityId,
            program_name: parsed.program_name || 'Program',
            degree_type: parsed.degree_type || '-',
            duration: parsed.duration || '-',
            tuition_fee: parsed.tuition_fee || '-',
            minimum_sat_score: parsed.minimum_sat_score || '-',
            intake_semester: parsed.intake_semester || '-',
            eligibility_requirements: parsed.eligibility_requirements || '',
            program_description: parsed.program_description || '',
            is_active: parsed.is_active ?? true,
          } as UniversityProgram;
        } catch {
          return {
            id: `legacy-${universityId}-${index}`,
            university_id: universityId,
            program_name: entry || 'Program',
            degree_type: '-',
            duration: '-',
            tuition_fee: '-',
            minimum_sat_score: '-',
            intake_semester: '-',
            eligibility_requirements: '',
            program_description: '',
            is_active: true,
          } as UniversityProgram;
        }
      }

      return {
        id: `legacy-${universityId}-${index}`,
        university_id: universityId,
        program_name: String(entry?.program_name || 'Program'),
        degree_type: String(entry?.degree_type || '-'),
        duration: String(entry?.duration || '-'),
        tuition_fee: String(entry?.tuition_fee || '-'),
        minimum_sat_score: String(entry?.minimum_sat_score || '-'),
        intake_semester: String(entry?.intake_semester || '-'),
        eligibility_requirements: String(entry?.eligibility_requirements || ''),
        program_description: String(entry?.program_description || ''),
        is_active: entry?.is_active ?? true,
      } as UniversityProgram;
    })
    .filter(Boolean);
}

export async function addUniversityProgram(universityId: string, program: UniversityProgramInput) {
  const payload = {
    university_id: universityId,
    ...program,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('university_programs')
    .insert(payload)
    .select('*')
    .single();

  if (!error) return data as UniversityProgram;

  if (!isMissingUniversityProgramsTableError(error)) {
    throw toReadableUniversityError(error);
  }

  // Fallback for legacy schema: persist serialized program objects in universities.programs.
  const { data: university, error: universityError } = await supabase
    .from('universities')
    .select('programs')
    .eq('id', universityId)
    .single();

  if (universityError) throw toReadableUniversityError(universityError);

  const existingPrograms = Array.isArray(university?.programs) ? [...university.programs] : [];
  existingPrograms.push(JSON.stringify({ ...program, is_active: true }));

  const { error: updateError } = await supabase
    .from('universities')
    .update({ programs: existingPrograms })
    .eq('id', universityId);

  if (updateError) throw toReadableUniversityError(updateError);

  return {
    id: `legacy-${Date.now()}`,
    university_id: universityId,
    ...program,
    is_active: true,
  } as UniversityProgram;
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
  if (sessionData.user?.id) {
    const profileWithUniversityId = await supabase
      .from('profiles')
      .select('role, university_id')
      .eq('id', sessionData.user.id)
      .maybeSingle();

    if (profileWithUniversityId.error) {
      if (!isMissingUniversityIdColumnError(profileWithUniversityId.error)) {
        throw toReadableUniversityError(profileWithUniversityId.error);
      }

      const profileWithoutUniversityId = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionData.user.id)
        .maybeSingle();

      if (profileWithoutUniversityId.error) {
        throw toReadableUniversityError(profileWithoutUniversityId.error);
      }

      if (profileWithoutUniversityId.data?.role === 'university-admin') {
        throw new Error('University admins cannot create additional universities. Use Add Details to manage programs.');
      }
    } else if (profileWithUniversityId.data?.university_id) {
      throw new Error('University admins cannot create additional universities. Use Add Details to manage programs.');
    }
  }

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