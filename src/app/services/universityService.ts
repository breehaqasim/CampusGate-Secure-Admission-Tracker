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
  const mentionsPrograms =
    message.includes('university_programs') || message.includes('"university_programs"');
  if (!mentionsPrograms) return false;
  return (
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

function isUndefinedColumnError(error: any, columnSnakeCase: string) {
  const message = String(error?.message || '').toLowerCase();
  const col = columnSnakeCase.toLowerCase();
  if (!message.includes(col)) return false;
  return (
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('undefined column')
  );
}

/** Normalize DB row shapes (e.g. sat_score vs minimum_sat_score) for the UI. */
function mapProgramRow(row: any): UniversityProgram {
  if (!row) {
    throw new Error('No program row returned after save.');
  }
  return {
    id: row.id,
    university_id: row.university_id,
    program_name: String(row.program_name ?? ''),
    degree_type: String(row.degree_type ?? ''),
    duration: String(row.duration ?? ''),
    tuition_fee: String(row.tuition_fee ?? row.cost ?? ''),
    minimum_sat_score: String(row.minimum_sat_score ?? row.sat_score ?? ''),
    intake_semester: String(row.intake_semester ?? ''),
    eligibility_requirements: String(row.eligibility_requirements ?? ''),
    program_description: String(row.program_description ?? ''),
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
  /** Index in `universities.programs` when using legacy storage (not `university_programs`). */
  legacy_storage_index?: number;
}

async function fetchUniversityAdminProfile(userId: string): Promise<{
  profile: any;
  hasUniversityIdColumn: boolean;
}> {
  const profileWithUniversityId = await supabase
    .from('profiles')
    .select('id, full_name, role, university_id, university_name')
    .eq('id', userId)
    .single();

  if (!profileWithUniversityId.error) {
    return { profile: profileWithUniversityId.data, hasUniversityIdColumn: true };
  }

  const err = profileWithUniversityId.error;
  if (!isMissingUniversityIdColumnError(err)) {
    throw toReadableUniversityError(err);
  }

  const profileWithoutUniversityId = await supabase
    .from('profiles')
    .select('id, full_name, role, university_name')
    .eq('id', userId)
    .single();

  if (profileWithoutUniversityId.error) {
    throw toReadableUniversityError(profileWithoutUniversityId.error);
  }

  return { profile: profileWithoutUniversityId.data, hasUniversityIdColumn: false };
}

/** Resolve university from profile link (id or name); backfill profile.university_id when applicable. */
async function resolveUniversityFromProfile(
  profile: any,
  hasUniversityIdColumn: boolean
): Promise<any | null> {
  if (profile?.university_id) {
    const { data: uniById, error: uniByIdError } = await supabase
      .from('universities')
      .select('*')
      .eq('id', profile.university_id)
      .maybeSingle();

    if (uniByIdError) throw toReadableUniversityError(uniByIdError);
    return uniById;
  }

  if (!profile?.university_name) {
    return null;
  }

  const { data: uniByName, error: uniByNameError } = await supabase
    .from('universities')
    .select('*')
    .ilike('name', profile.university_name)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uniByNameError) throw toReadableUniversityError(uniByNameError);

  if (hasUniversityIdColumn && uniByName?.id) {
    await supabase.from('profiles').update({ university_id: uniByName.id }).eq('id', profile.id);
  }

  return uniByName;
}

/** Legacy fallback: infer linked university from creator relationship. */
async function fetchUniversityByCreator(userId: string): Promise<any | null> {
  const { data: uniByCreator, error: uniByCreatorError } = await supabase
    .from('universities')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uniByCreatorError) throw toReadableUniversityError(uniByCreatorError);
  return uniByCreator;
}

export async function getAdminUniversityContext() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error('No authenticated user found');

  const { profile, hasUniversityIdColumn } = await fetchUniversityAdminProfile(userId);

  if (profile?.role !== 'university-admin') {
    throw new Error('Access denied. Only university admins can access this dashboard.');
  }

  let university =
    (await resolveUniversityFromProfile(profile, hasUniversityIdColumn)) ??
    (await fetchUniversityByCreator(userId));

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

  if (!error) {
    return (data || []).map((row: any) => mapProgramRow(row));
  }

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
            legacy_storage_index: index,
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
            legacy_storage_index: index,
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
        legacy_storage_index: index,
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
  const payload: Record<string, unknown> = {
    university_id: universityId,
    ...program,
    is_active: true,
  };

  const tryInsert = async (row: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('university_programs')
      .insert(row)
      .select('*')
      .maybeSingle();

    const singleError =
      error ??
      ((!data
        ? ({
            message:
              'Save may have succeeded but no row was returned. In Supabase, allow INSERT and SELECT on university_programs for your role (RETURNING rows), or use the legacy universities.programs column.',
          } as any)
        : null) as any);
    return { data, error: singleError as any };
  };

  let { data, error } = await tryInsert(payload);

  if (!error && data) {
    return mapProgramRow(data);
  }

  // Common schema aliases (local Supabase setups differ).
  if (error && isUndefinedColumnError(error, 'minimum_sat_score')) {
    const { minimum_sat_score, ...rest } = payload;
    const trimmed = String(minimum_sat_score ?? '').trim();
    const next = trimmed ? { ...rest, sat_score: trimmed } : { ...rest };
    ({ data, error } = await tryInsert(next));
    if (!error && data) {
      return mapProgramRow(data);
    }
  }

  if (error && isUndefinedColumnError(error, 'tuition_fee')) {
    const { tuition_fee, ...rest } = payload;
    const next = { ...rest, cost: tuition_fee };
    ({ data, error } = await tryInsert(next));
    if (!error && data) {
      return mapProgramRow(data);
    }
  }

  // Both tuition_fee & minimum_sat_score wrong on same insert — try cost + sat_score.
  const p = { ...payload } as Record<string, unknown>;
  if (typeof p.minimum_sat_score === 'string' && p.minimum_sat_score.trim()) {
    p.sat_score = p.minimum_sat_score;
    delete p.minimum_sat_score;
  }
  if (typeof p.tuition_fee === 'string') {
    p.cost = p.tuition_fee;
    delete p.tuition_fee;
  }
  ({ data, error } = await tryInsert(p));
  if (!error && data) {
    return mapProgramRow(data);
  }

  const lastError = error;

  if (!isMissingUniversityProgramsTableError(lastError)) {
    throw toReadableUniversityError(lastError);
  }

  // Fallback for legacy schema: persist serialized program objects in universities.programs.
  const { data: university, error: universityError } = await supabase
    .from('universities')
    .select('programs')
    .eq('id', universityId)
    .single();

  if (universityError) throw toReadableUniversityError(universityError);

  const existingPrograms = Array.isArray(university?.programs) ? [...university.programs] : [];
  const newIndex = existingPrograms.length;
  existingPrograms.push(JSON.stringify({ ...program, is_active: true }));

  const { error: updateError } = await supabase
    .from('universities')
    .update({ programs: existingPrograms })
    .eq('id', universityId);

  if (updateError) throw toReadableUniversityError(updateError);

  return {
    id: `legacy-${universityId}-${newIndex}`,
    university_id: universityId,
    legacy_storage_index: newIndex,
    ...program,
    is_active: true,
  } as UniversityProgram;
}

function programInputToRow(program: UniversityProgramInput, isActive?: boolean): Record<string, unknown> {
  const row: Record<string, unknown> = {
    program_name: String(program.program_name || '').trim(),
    degree_type: String(program.degree_type || '').trim(),
    duration: String(program.duration || '').trim(),
    tuition_fee: String(program.tuition_fee || '').trim(),
    minimum_sat_score: String(program.minimum_sat_score || '').trim(),
    intake_semester: String(program.intake_semester || '').trim(),
    eligibility_requirements: String(program.eligibility_requirements || '').trim(),
    program_description: String(program.program_description || '').trim(),
  };
  if (typeof isActive === 'boolean') {
    row.is_active = isActive;
  }
  return row;
}

function getLegacyProgramsArrayIndex(program: UniversityProgram, universityId: string): number | null {
  if (typeof program.legacy_storage_index === 'number' && program.legacy_storage_index >= 0) {
    return program.legacy_storage_index;
  }
  const prefix = `legacy-${universityId}-`;
  if (program.id.startsWith(prefix)) {
    const idx = parseInt(program.id.slice(prefix.length), 10);
    return Number.isNaN(idx) ? null : idx;
  }
  if (/^legacy-\d+$/.test(program.id)) {
    return typeof program.legacy_storage_index === 'number' ? program.legacy_storage_index : null;
  }
  return null;
}

async function fetchLegacyProgramsBucket(universityId: string): Promise<any[]> {
  const { data: university, error } = await supabase
    .from('universities')
    .select('programs')
    .eq('id', universityId)
    .single();

  if (error) throw toReadableUniversityError(error);
  return Array.isArray(university?.programs) ? [...university.programs] : [];
}

function bucketEntryToProgramObject(raw: any): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? { ...parsed } : { program_name: raw };
    } catch {
      return { program_name: raw };
    }
  }
  if (raw && typeof raw === 'object') {
    return { ...raw };
  }
  return { program_name: String(raw ?? 'Program') };
}

function mergedLegacyProgramFromObject(
  base: Record<string, unknown>,
  row: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...base,
    program_name: row.program_name ?? base.program_name,
    degree_type: row.degree_type ?? base.degree_type,
    duration: row.duration ?? base.duration,
    tuition_fee: row.tuition_fee ?? base.tuition_fee,
    minimum_sat_score: row.minimum_sat_score ?? base.minimum_sat_score,
    intake_semester: row.intake_semester ?? base.intake_semester,
    eligibility_requirements: row.eligibility_requirements ?? base.eligibility_requirements,
    program_description: row.program_description ?? base.program_description,
    is_active:
      typeof row.is_active === 'boolean' ? row.is_active : base.is_active ?? true,
  };
}

async function persistLegacyProgramsBucket(universityId: string, bucket: any[]) {
  const { error: updateError } = await supabase
    .from('universities')
    .update({ programs: bucket })
    .eq('id', universityId);

  if (updateError) throw toReadableUniversityError(updateError);
}

function legacyObjectToUniversityProgram(
  universityId: string,
  idx: number,
  obj: Record<string, unknown>
): UniversityProgram {
  const is_active = typeof obj.is_active === 'boolean' ? obj.is_active : true;
  return {
    id: `legacy-${universityId}-${idx}`,
    university_id: universityId,
    legacy_storage_index: idx,
    program_name: String(obj.program_name ?? 'Program'),
    degree_type: String(obj.degree_type ?? '-'),
    duration: String(obj.duration ?? '-'),
    tuition_fee: String(obj.tuition_fee ?? '-'),
    minimum_sat_score: String(obj.minimum_sat_score ?? ''),
    intake_semester: String(obj.intake_semester ?? ''),
    eligibility_requirements: String(obj.eligibility_requirements ?? ''),
    program_description: String(obj.program_description ?? ''),
    is_active,
  };
}

export async function updateUniversityProgram(
  universityId: string,
  program: UniversityProgram,
  updates: UniversityProgramInput & { is_active?: boolean }
) {
  const legacyIdx = getLegacyProgramsArrayIndex(program, universityId);

  if (legacyIdx !== null) {
    const bucket = await fetchLegacyProgramsBucket(universityId);
    if (legacyIdx >= bucket.length) {
      throw new Error('Program not found in legacy storage.');
    }
    const base = bucketEntryToProgramObject(bucket[legacyIdx]);
    const merged = mergedLegacyProgramFromObject(base, {
      ...programInputToRow(updates),
      ...(typeof updates.is_active === 'boolean' ? { is_active: updates.is_active } : {}),
    });
    bucket[legacyIdx] = JSON.stringify(merged);
    await persistLegacyProgramsBucket(universityId, bucket);
    return legacyObjectToUniversityProgram(universityId, legacyIdx, merged);
  }

  const programId = program.id;
  const row = programInputToRow(updates);
  if (typeof updates.is_active === 'boolean') {
    row.is_active = updates.is_active;
  }

  const tryUpdate = async (patch: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('university_programs')
      .update(patch)
      .eq('id', programId)
      .eq('university_id', universityId)
      .select('*')
      .maybeSingle();

    const singleError =
      error ??
      ((!data
        ? ({
            message:
              'Update may have succeeded but no row was returned. Check Supabase UPDATE + SELECT policies for university_programs.',
          } as any)
        : null) as any);
    return { data, error: singleError as any };
  };

  let { data, error } = await tryUpdate(row);

  if (!error && data) {
    return mapProgramRow(data);
  }

  if (error && isUndefinedColumnError(error, 'minimum_sat_score')) {
    const { minimum_sat_score, ...rest } = row;
    const trimmed = String(minimum_sat_score ?? '').trim();
    const next = trimmed ? { ...rest, sat_score: trimmed } : { ...rest };
    ({ data, error } = await tryUpdate(next));
    if (!error && data) {
      return mapProgramRow(data);
    }
  }

  if (error && isUndefinedColumnError(error, 'tuition_fee')) {
    const { tuition_fee, ...rest } = row;
    const next = { ...rest, cost: tuition_fee };
    ({ data, error } = await tryUpdate(next));
    if (!error && data) {
      return mapProgramRow(data);
    }
  }

  const p = { ...row } as Record<string, unknown>;
  if (typeof p.minimum_sat_score === 'string' && p.minimum_sat_score.trim()) {
    p.sat_score = p.minimum_sat_score;
    delete p.minimum_sat_score;
  }
  if (typeof p.tuition_fee === 'string') {
    p.cost = p.tuition_fee;
    delete p.tuition_fee;
  }
  ({ data, error } = await tryUpdate(p));
  if (!error && data) {
    return mapProgramRow(data);
  }

  if (!isMissingUniversityProgramsTableError(error)) {
    throw toReadableUniversityError(error);
  }

  throw new Error('Cannot update programs: university_programs is missing and legacy row was not found.');
}

export async function deleteUniversityProgram(universityId: string, program: UniversityProgram) {
  const legacyIdx = getLegacyProgramsArrayIndex(program, universityId);

  if (legacyIdx !== null) {
    const bucket = await fetchLegacyProgramsBucket(universityId);
    if (legacyIdx >= bucket.length) {
      throw new Error('Program not found.');
    }
    bucket.splice(legacyIdx, 1);
    await persistLegacyProgramsBucket(universityId, bucket);
    return;
  }

  const { data, error } = await supabase
    .from('university_programs')
    .delete()
    .eq('id', program.id)
    .eq('university_id', universityId)
    .select('id')
    .maybeSingle();

  if (error) throw toReadableUniversityError(error);

  if (data?.id) {
    return;
  }

  throw new Error('Delete failed: program not found or blocked by Row Level Security.');
}

export async function setUniversityProgramActive(
  universityId: string,
  program: UniversityProgram,
  isActive: boolean
) {
  const legacyIdx = getLegacyProgramsArrayIndex(program, universityId);

  if (legacyIdx !== null) {
    const bucket = await fetchLegacyProgramsBucket(universityId);
    if (legacyIdx >= bucket.length) {
      throw new Error('Program not found.');
    }
    const base = bucketEntryToProgramObject(bucket[legacyIdx]);
    const merged = { ...base, is_active: isActive };
    bucket[legacyIdx] = JSON.stringify(merged);
    await persistLegacyProgramsBucket(universityId, bucket);
    return legacyObjectToUniversityProgram(universityId, legacyIdx, merged);
  }

  const patch: Record<string, unknown> = { is_active: isActive };

  const { data, error } = await supabase
    .from('university_programs')
    .update(patch)
    .eq('id', program.id)
    .eq('university_id', universityId)
    .select('*')
    .maybeSingle();

  const singleError =
    error ??
    ((!data
      ? ({
          message:
            'Update may have succeeded but no row was returned. Check Supabase UPDATE + SELECT policies for university_programs.',
        } as any)
      : null) as any);

  if (!singleError && data) {
    return mapProgramRow(data);
  }

  throw toReadableUniversityError(singleError);
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