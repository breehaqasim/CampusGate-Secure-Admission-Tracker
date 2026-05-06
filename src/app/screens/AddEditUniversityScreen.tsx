import { useState } from 'react';
import { BackButton } from '../components/BackButton';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { TagInput } from '../components/TagInput';
import { Building2, MapPin, Globe, DollarSign, GraduationCap, BookOpen, Star } from 'lucide-react';

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
  });

  const [programs, setPrograms] = useState<string[]>(
    isEdit ? ['Computer Science', 'Engineering', 'Business', 'Medicine'] : []
  );

  const [features, setFeatures] = useState(
    isEdit ? 'Stanford University offers state-of-the-art facilities including modern research labs, extensive library resources, world-class sports facilities, and a vibrant campus community.' : ''
  );

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving university:', { ...formData, programs, features });
    onSave();
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

              <Input
                label="Annual Cost ($)"
                type="text"
                placeholder="e.g., 55000"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                icon={<DollarSign size={18} />}
                required
              />
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
                {isEdit ? 'Update University' : 'Add University'}
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
