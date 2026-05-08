import { useEffect, useState } from 'react';
import { BackButton } from '../components/BackButton';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { TagInput } from '../components/TagInput';
import { Building2, MapPin, Globe, DollarSign, GraduationCap, BookOpen, Star } from 'lucide-react';
import {
  addUniversity,
  getUniversityById,
  updateUniversity,
} from '../services/universityService';

const fallbackCurrencies = [
  'USD', 'EUR', 'GBP', 'PKR', 'INR', 'CAD', 'AUD', 'JPY', 'CNY', 'SAR', 'AED',
];

const allCurrencies = (
  typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf
    ? (Intl as any).supportedValuesOf('currency')
    : fallbackCurrencies
) as string[];

interface AddEditUniversityScreenProps {
  universityId?: string;
  onBack: () => void;
  onSave: () => void;
}

export function AddEditUniversityScreen({ universityId, onBack, onSave }: AddEditUniversityScreenProps) {
  const isEdit = !!universityId;

  const [formData, setFormData] = useState({
    name: isEdit ? 'Stanford University' : '',
    country: isEdit ? 'United States' : '',
    city: isEdit ? 'Stanford' : '',
    type: isEdit ? 'Private' : '',
    satScore: isEdit ? '1420' : '',
    cost: isEdit ? '55000' : '',
    currency: isEdit ? 'USD' : 'USD',
  });

  const [programs, setPrograms] = useState<string[]>(
    isEdit ? ['Computer Science', 'Engineering', 'Business', 'Medicine'] : []
  );

  const [features, setFeatures] = useState(
    isEdit ? 'Stanford University offers state-of-the-art facilities including modern research labs, extensive library resources, world-class sports facilities, and a vibrant campus community.' : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const parsePrograms = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/^\{|\}$/g, '');
      return normalized
        .split(',')
        .map((item) => item.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }

    return [];
  };

  const parseCost = (value: string) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^([A-Z]{3})\s+(.+)$/);
    if (match) {
      return {
        currency: match[1],
        amount: match[2],
      };
    }

    return {
      currency: 'USD',
      amount: raw,
    };
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!isEdit || !universityId) return;

    const loadUniversity = async () => {
      try {
        setIsLoading(true);
        const university = await getUniversityById(universityId);
        const parsedCost = parseCost(String(university?.cost ?? ''));
        setFormData({
          name: university?.name || '',
          country: university?.country || '',
          city: university?.city || '',
          type: university?.type || '',
          satScore: String(university?.sat_score ?? university?.satScore ?? ''),
          cost: parsedCost.amount,
          currency: parsedCost.currency,
        });
        setPrograms(parsePrograms(university?.programs));
        setFeatures(university?.features || '');
      } catch (error: any) {
        alert(error.message || 'Failed to load university details');
      } finally {
        setIsLoading(false);
      }
    };

    loadUniversity();
  }, [isEdit, universityId]);

  const handleSave = async () => {
    if (isSaving) return;

    if (!formData.name || !formData.country || !formData.city) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name,
        country: formData.country,
        city: formData.city,
        type: formData.type,
        sat_score: formData.satScore,
        cost: `${formData.currency} ${formData.cost}`.trim(),
        programs: programs.map((program) => program.trim()).filter(Boolean),
        features,
      };

      if (isEdit && universityId) {
        await updateUniversity(universityId, payload);
        alert('University updated successfully');
      } else {
        await addUniversity(payload);
        alert('University added successfully');
      }

      onSave();
    } catch (error: any) {
      alert(error.message || 'Failed to save university');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] dark relative">
      <div className="p-8">
        <BackButton onClick={onBack} />

        <div className="w-full mt-12">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#31A6A8]/10 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={32} className="text-[#31A6A8]" />
            </div>
            <h1 className="text-white text-3xl mb-2">
              {isEdit ? 'Edit University' : 'Add New University'}
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              {isEdit ? 'Update university information' : 'Enter university details'}
            </p>
          </div>

          <div className="space-y-5">
            {isLoading && (
              <p className="text-sm text-[#a0a0a0]">Loading university details...</p>
            )}
            <Input
              label="University Name"
              type="text"
              placeholder="e.g., Stanford University"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              icon={<Building2 size={18} />}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Country"
                type="text"
                placeholder="e.g., United States"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                icon={<Globe size={18} />}
                required
              />

              <Input
                label="City"
                type="text"
                placeholder="e.g., Stanford"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                icon={<MapPin size={18} />}
                required
              />
            </div>

            <Input
              label="University Type"
              type="text"
              placeholder="e.g., Private, Public"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              icon={<Building2 size={18} />}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Minimum SAT Score"
                type="text"
                placeholder="e.g., 1420"
                value={formData.satScore}
                onChange={(e) => handleChange('satScore', e.target.value)}
                icon={<GraduationCap size={18} />}
                required
              />

              <div className="space-y-2">
                <label className="block text-white text-sm">
                  Annual Cost
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="col-span-1 h-12 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 text-white focus:outline-none focus:border-[#31A6A8] focus:ring-2 focus:ring-[#31A6A8]/20 transition-all"
                  >
                    {allCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <div className="col-span-2">
                    <Input
                      label=""
                      type="text"
                      placeholder="e.g., 55000"
                      value={formData.cost}
                      onChange={(e) => handleChange('cost', e.target.value)}
                      icon={<DollarSign size={18} />}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <TagInput
              label="Programs Offered"
              placeholder="e.g., Computer Science"
              tags={programs}
              onTagsChange={setPrograms}
              icon={<BookOpen size={18} />}
              required
            />

            <div className="space-y-2">
              <label className="block text-white text-sm">
                University Features
                <span className="text-[#6a6a6a] ml-2 font-normal">(Optional)</span>
              </label>
              <textarea
                placeholder="Describe university features, facilities, campus life, etc."
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={4}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6a6a6a] focus:outline-none focus:border-[#31A6A8] focus:ring-2 focus:ring-[#31A6A8]/20 transition-all resize-none"
              />
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="primary" size="lg" onClick={handleSave} className="flex-1">
                {isSaving ? 'Saving...' : isEdit ? 'Update University' : 'Add University'}
              </Button>
              <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
