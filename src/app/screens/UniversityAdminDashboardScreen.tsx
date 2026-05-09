import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus, Building2, BookOpen, Pencil, Trash2 } from 'lucide-react';
import {
  addUniversityProgram,
  deleteUniversityProgram,
  getAdminUniversityContext,
  getProgramsByUniversity,
  setUniversityProgramActive,
  updateUniversityProgram,
  UniversityProgram,
  UniversityProgramInput,
} from '../services/universityService';

interface UniversityAdminDashboardScreenProps {
  onLogout: () => void;
}

export function UniversityAdminDashboardScreen({
  onLogout,
}: UniversityAdminDashboardScreenProps) {
  const [university, setUniversity] = useState<any | null>(null);
  const [programs, setPrograms] = useState<UniversityProgram[]>([]);
  const [adminName, setAdminName] = useState('Admin User');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<UniversityProgram | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyProgramId, setBusyProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState<UniversityProgramInput>({
    program_name: '',
    degree_type: '',
    duration: '',
    tuition_fee: '',
    minimum_sat_score: '',
    intake_semester: '',
    eligibility_requirements: '',
    program_description: '',
  });

  const activePrograms = programs.filter((program) => program.is_active !== false).length;

  const resetProgramForm = () => {
    setProgramForm({
      program_name: '',
      degree_type: '',
      duration: '',
      tuition_fee: '',
      minimum_sat_score: '',
      intake_semester: '',
      eligibility_requirements: '',
      program_description: '',
    });
    setEditingProgram(null);
  };

  const openAddProgramModal = () => {
    resetProgramForm();
    setIsModalOpen(true);
  };

  const openEditProgramModal = (program: UniversityProgram) => {
    setEditingProgram(program);
    setProgramForm({
      program_name: program.program_name,
      degree_type: program.degree_type,
      duration: program.duration,
      tuition_fee: program.tuition_fee,
      minimum_sat_score: program.minimum_sat_score,
      intake_semester: program.intake_semester,
      eligibility_requirements: program.eligibility_requirements,
      program_description: program.program_description,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetProgramForm();
  };

  const handleProgramInputChange = (field: keyof UniversityProgramInput, value: string) => {
    setProgramForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadDashboardData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent;
    try {
      if (!silent) setIsLoading(true);
      const context = await getAdminUniversityContext();
      setAdminName(context.admin?.full_name || 'Admin User');
      setUniversity(context.university);
      const linkedPrograms = await getProgramsByUniversity(context.university.id);
      setPrograms(linkedPrograms);
    } catch (error: any) {
      console.error(error);
      setUniversity(null);
      setPrograms([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const persistProgramModal = async () => {
    if (!university?.id) {
      alert('No university is linked to your admin account yet. Reload the page after your profile has a university, or contact support.');
      return;
    }

    if (
      !String(programForm.program_name || '').trim() ||
      !String(programForm.degree_type || '').trim() ||
      !String(programForm.duration || '').trim() ||
      !String(programForm.tuition_fee || '').trim()
    ) {
      alert('Please fill all required fields: Program name, Degree type, Duration, and Tuition fee.');
      return;
    }

    try {
      setIsSavingProgram(true);
      const trimmedForm: UniversityProgramInput = {
        ...programForm,
        program_name: programForm.program_name.trim(),
        degree_type: programForm.degree_type.trim(),
        duration: programForm.duration.trim(),
        tuition_fee: programForm.tuition_fee.trim(),
        minimum_sat_score: programForm.minimum_sat_score.trim(),
        intake_semester: programForm.intake_semester.trim(),
        eligibility_requirements: programForm.eligibility_requirements.trim(),
        program_description: programForm.program_description.trim(),
      };

      if (editingProgram) {
        await updateUniversityProgram(university.id, editingProgram, {
          ...trimmedForm,
          is_active: editingProgram.is_active !== false,
        });
        await loadDashboardData({ silent: true });
        alert('Program updated successfully');
      } else {
        await addUniversityProgram(university.id, trimmedForm);
        await loadDashboardData({ silent: true });
        alert('Program details added successfully');
      }

      closeModal();
    } catch (error: any) {
      alert(error.message || 'Failed to save program');
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleToggleProgramActive = async (program: UniversityProgram) => {
    if (!university?.id) return;
    const nextActive = program.is_active === false;
    try {
      setBusyProgramId(program.id);
      await setUniversityProgramActive(university.id, program, nextActive);
      await loadDashboardData({ silent: true });
    } catch (error: any) {
      alert(error.message || 'Failed to update program status');
    } finally {
      setBusyProgramId(null);
    }
  };

  const handleDeleteProgram = async (program: UniversityProgram) => {
    if (!university?.id) return;
    const label = program.program_name || 'this program';
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      setBusyProgramId(program.id);
      await deleteUniversityProgram(university.id, program);
      await loadDashboardData({ silent: true });
    } catch (error: any) {
      alert(error.message || 'Failed to delete program');
    } finally {
      setBusyProgramId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] dark">
      <Navbar userName={adminName} onLogout={onLogout} />

      <main className="p-8">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl mb-2">
                {university?.name || 'University Management'}
              </h1>
              {university && (
                <p className="text-[#8a8a8a] text-sm mb-1">
                  {[university.city, university.country].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-[#a0a0a0]">Manage your university programs and details</p>
            </div>
            <Button
              variant="primary"
              onClick={() => openAddProgramModal()}
              disabled={!university || isLoading}
            >
              <Plus size={20} className="mr-2" />
              Add Program
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <div className="text-center">
                <p className="text-[#a0a0a0] text-sm mb-2">Total Programs</p>
                <p className="text-4xl text-white">{programs.length}</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-[#a0a0a0] text-sm mb-2">Active Programs</p>
                <p className="text-4xl text-white">{activePrograms}</p>
              </div>
            </Card>
          </div>

          <Card title="Program Management" subtitle="Manage programs offered by your university">
            {programs.length === 0 ? (
              <p className="text-[#a0a0a0] text-sm">
                No programs added yet. Click 'Add Program' to add university programs.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Program Name</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Degree Type</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Duration</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Tuition Fee</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Minimum SAT</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Intake</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Status</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Visible</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((program) => (
                      <tr
                        key={program.id}
                        className={`border-b border-[#2a2a2a] ${program.is_active === false ? 'opacity-55' : ''}`}
                      >
                        <td className="px-4 py-4 text-white">{program.program_name}</td>
                        <td className="px-4 py-4 text-white">{program.degree_type}</td>
                        <td className="px-4 py-4 text-white">{program.duration}</td>
                        <td className="px-4 py-4 text-white">{program.tuition_fee || '-'}</td>
                        <td className="px-4 py-4 text-white">{program.minimum_sat_score || '-'}</td>
                        <td className="px-4 py-4 text-white">{program.intake_semester || '-'}</td>
                        <td className="px-4 py-4">
                          <span
                            className={
                              program.is_active !== false ? 'text-[#31A6A8] text-sm' : 'text-[#8a6060] text-sm'
                            }
                          >
                            {program.is_active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-[#a0a0a0] text-sm select-none">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[#3a3a3a] bg-[#2a2a2a] text-[#31A6A8] accent-[#31A6A8] disabled:opacity-40"
                              checked={program.is_active !== false}
                              disabled={busyProgramId === program.id}
                              onChange={() => void handleToggleProgramActive(program)}
                            />
                            <span className="text-white text-xs">On</span>
                          </label>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              aria-label={`Edit ${program.program_name}`}
                              disabled={busyProgramId === program.id}
                              onClick={() => openEditProgramModal(program)}
                              className="rounded-lg border border-[#3a3a3a] p-2 text-[#31A6A8] hover:bg-[#252525] disabled:opacity-40"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${program.program_name}`}
                              disabled={busyProgramId === program.id}
                              onClick={() => void handleDeleteProgram(program)}
                              className="rounded-lg border border-[#3a3a3a] p-2 text-[#e07a7a] hover:bg-[#252525] disabled:opacity-40"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#31A6A8]/10 rounded-xl flex items-center justify-center">
                <BookOpen size={24} className="text-[#31A6A8]" />
              </div>
              <div>
                <h2 className="text-white text-2xl">
                  {editingProgram ? 'Edit Program Details' : 'Add Program Details'}
                </h2>
                <p className="text-[#a0a0a0] text-sm">
                  {editingProgram
                    ? `Update "${editingProgram.program_name}"`
                    : `Add programs for ${university?.name || 'your university'}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">Program Name *</label>
                <input
                  value={programForm.program_name}
                  onChange={(e) => handleProgramInputChange('program_name', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Degree Type *</label>
                <input
                  value={programForm.degree_type}
                  onChange={(e) => handleProgramInputChange('degree_type', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., Bachelor's"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Duration *</label>
                <input
                  value={programForm.duration}
                  onChange={(e) => handleProgramInputChange('duration', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., 4 years"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Tuition Fee *</label>
                <input
                  value={programForm.tuition_fee}
                  onChange={(e) => handleProgramInputChange('tuition_fee', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., USD 24000"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Minimum SAT Score</label>
                <input
                  value={programForm.minimum_sat_score}
                  onChange={(e) => handleProgramInputChange('minimum_sat_score', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., 1250"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Intake/Semester</label>
                <input
                  value={programForm.intake_semester}
                  onChange={(e) => handleProgramInputChange('intake_semester', e.target.value)}
                  className="w-full h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 text-white"
                  placeholder="e.g., Fall / Spring"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-white text-sm mb-2">Eligibility Requirements</label>
              <textarea
                value={programForm.eligibility_requirements}
                onChange={(e) => handleProgramInputChange('eligibility_requirements', e.target.value)}
                rows={3}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white resize-none"
                placeholder="e.g., High school diploma, SAT score, English proficiency"
              />
            </div>
            <div className="mt-4">
              <label className="block text-white text-sm mb-2">Program Description</label>
              <textarea
                value={programForm.program_description}
                onChange={(e) => handleProgramInputChange('program_description', e.target.value)}
                rows={4}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white resize-none"
                placeholder="Describe the program, curriculum focus, and outcomes."
              />
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                variant="primary"
                size="lg"
                onClick={() => void persistProgramModal()}
                className="flex-1"
                disabled={isSavingProgram}
              >
                <Building2 size={18} className="mr-2" />
                {isSavingProgram ? 'Saving...' : editingProgram ? 'Update Program' : 'Save Program'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  closeModal();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
