import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { MapPin, Building2, DollarSign, GraduationCap } from 'lucide-react';

interface UniversityDetailsScreenProps {
  universityId: string;
  onBack: () => void;
  onLogout: () => void;
  onSaveToFavorites: (university: any) => void;
  isFavorite: boolean;
}

export function UniversityDetailsScreen({ universityId, onBack, onLogout, onSaveToFavorites, isFavorite }: UniversityDetailsScreenProps) {
  const university = {
    id: universityId,
    name: 'Stanford University',
    country: 'United States',
    city: 'Stanford, CA',
    type: 'Private',
    cost: '$55,000/year',
    satScore: '1420-1570',
    programs: [
      'Computer Science',
      'Business Administration',
      'Engineering',
      'Medicine',
      'Law',
      'Psychology',
      'Economics',
      'Biology',
    ],
  };

  const handleSaveToFavorites = () => {
    onSaveToFavorites(university);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] dark">
      <Navbar userName="John Doe" onLogout={onLogout} />

      <main className="p-8 relative">
        <BackButton onClick={onBack} />
        <div>
          <div className="mb-8">
            <h1 className="text-white text-4xl mb-3">{university.name}</h1>
            <p className="text-[#a0a0a0] flex items-center gap-2">
              <MapPin size={18} />
              {university.city}, {university.country}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card title="University Information">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#31A6A8]/10 rounded-lg flex items-center justify-center text-[#31A6A8] flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#a0a0a0] text-sm">Location</p>
                    <p className="text-white">{university.city}, {university.country}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#31A6A8]/10 rounded-lg flex items-center justify-center text-[#31A6A8] flex-shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#a0a0a0] text-sm">Type</p>
                    <p className="text-white">{university.type} University</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#31A6A8]/10 rounded-lg flex items-center justify-center text-[#31A6A8] flex-shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#a0a0a0] text-sm">Annual Cost</p>
                    <p className="text-white">{university.cost}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#31A6A8]/10 rounded-lg flex items-center justify-center text-[#31A6A8] flex-shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#a0a0a0] text-sm">SAT Score Range</p>
                    <p className="text-white">{university.satScore}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Available Programs">
              <div className="flex flex-wrap gap-2">
                {university.programs.map((program, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-[#31A6A8]/10 border border-[#31A6A8]/30 text-[#31A6A8] rounded-lg text-sm"
                  >
                    {program}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex gap-4">
            <Button variant="primary" size="lg">
              Apply Now
            </Button>
            <Button
              variant={isFavorite ? "secondary" : "outline"}
              size="lg"
              onClick={handleSaveToFavorites}
            >
              {isFavorite ? '❤️ Saved to Favorites' : '🤍 Save to Favorites'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
