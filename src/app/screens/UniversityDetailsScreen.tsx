import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import {
  MapPin,
  GraduationCap,
  BookOpen,
  Clock,
  Receipt,
  Calendar,
  ListChecks,
  FileText,
  Heart,
} from 'lucide-react';
import {
  getProgramsByUniversity,
  getUniversityById,
  UniversityProgram,
} from '../services/universityService';
import { supabase } from '../../lib/supabase';

interface UniversityDetailsScreenProps {
  universityId: string;
  onBack: () => void;
  onLogout: () => void;
  onSaveToFavorites: (university: any) => void;
  isFavorite: boolean;
}

async function fetchStudentProfileName(): Promise<string> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return 'Student';
    }

    const metadataName = String(authData.user.user_metadata?.full_name || '').trim();
    const emailFallback = String(authData.user.email || '')
      .split('@')[0]
      ?.replace(/[._-]/g, ' ')
      ?.trim();

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authData.user.id)
      .maybeSingle();

    return (
      String(profile?.full_name || '').trim() ||
      metadataName ||
      emailFallback ||
      'Student'
    );
  } catch (e) {
    console.error(e);
    return 'Student';
  }
}

type UniversityDetailLoadSetters = {
  setIsLoading: (value: boolean) => void;
  setLoadError: (value: string | null) => void;
  setUniversityRow: (value: any | null) => void;
  setPrograms: (value: UniversityProgram[]) => void;
};

async function runUniversityDetailsLoad(
  universityId: string,
  {
    setIsLoading,
    setLoadError,
    setUniversityRow,
    setPrograms,
  }: UniversityDetailLoadSetters
): Promise<void> {
  if (!universityId.trim()) {
    setLoadError('Missing university.');
    setUniversityRow(null);
    setPrograms([]);
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    setLoadError(null);

    const [uni, programRows] = await Promise.all([
      getUniversityById(universityId),
      getProgramsByUniversity(universityId),
    ]);

    setUniversityRow(uni);
    setPrograms(programRows);
  } catch (error: any) {
    console.error(error);
    setLoadError(error?.message || 'Failed to load university');
    setUniversityRow(null);
    setPrograms([]);
  } finally {
    setIsLoading(false);
  }
}

interface UniversityDetailsMainBodyProps {
  isLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => Promise<void>;
  displayName: string;
  locationLine: string | null;
  visiblePrograms: UniversityProgram[];
  onSaveToFavorites: () => void;
  isFavorite: boolean;
}

function UniversityDetailsMainBody({
  isLoading,
  loadError,
  onRetryLoad,
  displayName,
  locationLine,
  visiblePrograms,
  onSaveToFavorites,
  isFavorite,
}: UniversityDetailsMainBodyProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#31A6A8]/30 border-t-[#31A6A8]" />
        <p className="text-sm text-[#8a8a8a]">Loading university profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-[#403030] bg-[#1a1414] p-8 text-center">
        <p className="text-[#e8a0a0]">{loadError}</p>
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <header className="relative mb-12 overflow-hidden rounded-2xl border border-[#252525] bg-[#131313] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#31A6A8] via-[#3db9bb] to-[#268d8f]" />
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
                {displayName}
              </h1>
              {locationLine ? (
                <p className="mt-3 flex items-center gap-2 text-[#a3a3a3]">
                  <MapPin size={18} className="shrink-0 text-[#31A6A8]" />
                  <span>{locationLine}</span>
                </p>
              ) : (
                <p className="mt-3 text-[#7a7a7a] text-sm">Location not specified in directory</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-[#2e2e2e] bg-[#181818] px-4 py-3 text-center">
                <p className="text-[11px] uppercase tracking-wider text-[#6a6a6a]">Programs listed</p>
                <p className="text-2xl font-semibold tabular-nums text-white">{visiblePrograms.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Programs — full DB fields */}
      <section className="mb-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="text-[#31A6A8]" size={22} />
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">Programs & admissions</h2>
              <p className="mt-1 text-sm text-[#757575]">
                Degree, duration, fees, scores, intake, eligibility, and descriptions come from your saved program
                records.
              </p>
            </div>
          </div>
        </div>

        {visiblePrograms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#333] bg-[#141414] px-6 py-14 text-center">
            <p className="text-[#8a8a8a]">No active programs are published for this university yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {visiblePrograms.map((program, idx) => (
              <ProgramCard key={program.id} program={program} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-4 border-t border-[#222] pt-10 sm:flex-row sm:items-center">
        <Button variant="primary" size="lg" className="sm:min-w-[160px]">
          Apply Now
        </Button>
        <Button
          variant={isFavorite ? 'secondary' : 'outline'}
          size="lg"
          onClick={onSaveToFavorites}
          className="sm:min-w-[200px]"
        >
          <Heart size={18} className={`mr-2 ${isFavorite ? 'fill-current' : ''}`} />
          {isFavorite ? 'Saved to favorites' : 'Save to favorites'}
        </Button>
      </div>
    </>
  );
}

function showValue(value: string | undefined | null): string {
  const t = String(value ?? '').trim();
  return t.length > 0 ? t : '—';
}

function ProgramDetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-[#141414] border border-[#252525] px-4 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#31A6A8]/12 text-[#31A6A8]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-[#6a6a6a]">{label}</p>
        <p className="text-sm font-medium text-[#ececec]">{value}</p>
      </div>
    </div>
  );
}

function ProgramCard({ program, index }: { program: UniversityProgram; index: number }) {
  const desc = String(program.program_description || '').trim();
  const elig = String(program.eligibility_requirements || '').trim();

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#161616] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-colors hover:border-[#31A6A8]/35"
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#31A6A8] to-[#268d8f]/40" aria-hidden />
      <div className="p-6 sm:p-8 pl-7 sm:pl-9">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[#31A6A8]/90">
              Program {index + 1}
            </p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{showValue(program.program_name)}</h3>
            <p className="mt-1 text-sm text-[#9a9a9a]">{showValue(program.degree_type)}</p>
          </div>
          {program.is_active === false ? (
            <span className="shrink-0 rounded-full border border-[#5a4040] bg-[#2a1f1f] px-3 py-1 text-xs font-medium text-[#d4a0a0]">
              Not accepting applications
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-[#2a5a57] bg-[#31A6A8]/10 px-3 py-1 text-xs font-medium text-[#5ec9cb]">
              Open
            </span>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProgramDetailStat icon={Clock} label="Duration" value={showValue(program.duration)} />
          <ProgramDetailStat icon={Receipt} label="Tuition fee" value={showValue(program.tuition_fee)} />
          <ProgramDetailStat
            icon={GraduationCap}
            label="Minimum SAT / score"
            value={showValue(program.minimum_sat_score)}
          />
          <ProgramDetailStat icon={Calendar} label="Intake / semester" value={showValue(program.intake_semester)} />
        </div>

        {(elig || desc) && (
          <div className="space-y-5 border-t border-[#252525] pt-6">
            {elig ? (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[#8a8a8a]">
                  <ListChecks size={16} className="text-[#31A6A8]" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Eligibility</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#c4c4c4]">{elig}</p>
              </div>
            ) : null}
            {desc ? (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[#8a8a8a]">
                  <FileText size={16} className="text-[#31A6A8]" />
                  <span className="text-xs font-semibold uppercase tracking-wide">About this program</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#b8b8b8]">{desc}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

export function UniversityDetailsScreen({
  universityId,
  onBack,
  onLogout,
  onSaveToFavorites,
  isFavorite,
}: UniversityDetailsScreenProps) {
  const [studentName, setStudentName] = useState('Student');
  const [universityRow, setUniversityRow] = useState<any | null>(null);
  const [programs, setPrograms] = useState<UniversityProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const visiblePrograms = useMemo(
    () => programs.filter((p) => p.is_active !== false),
    [programs]
  );

  const loadDetails = useCallback(async () => {
    await runUniversityDetailsLoad(universityId, {
      setIsLoading,
      setLoadError,
      setUniversityRow,
      setPrograms,
    });
  }, [universityId]);

  useEffect(() => {
    fetchStudentProfileName().then(setStudentName);
  }, []);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const displayName = String(universityRow?.name || '').trim() || 'University';

  const displayCity = String(universityRow?.city || '').trim();
  const displayCountry = String(universityRow?.country || '').trim();
  const locationLine =
    displayCity || displayCountry
      ? [displayCity, displayCountry].filter(Boolean).join(', ')
      : null;

  const favoritesPayload = universityRow
    ? { ...universityRow, id: universityRow.id || universityId }
    : { id: universityId, name: displayName, country: displayCountry, city: displayCity };

  const handleSaveToFavorites = () => {
    onSaveToFavorites(favoritesPayload);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] dark">
      <Navbar userName={studentName} onLogout={onLogout} />

      <main className="relative mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <BackButton onClick={onBack} className="static mb-8" />

        <UniversityDetailsMainBody
          isLoading={isLoading}
          loadError={loadError}
          onRetryLoad={loadDetails}
          displayName={displayName}
          locationLine={locationLine}
          visiblePrograms={visiblePrograms}
          onSaveToFavorites={handleSaveToFavorites}
          isFavorite={isFavorite}
        />
      </main>
    </div>
  );
}
