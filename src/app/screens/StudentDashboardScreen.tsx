import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Search, Globe, Heart, Trash2 } from 'lucide-react';
import { getUniversities } from '../services/universityService';
import { supabase } from "../../lib/supabase";

interface StudentDashboardScreenProps {
  onLogout: () => void;
  onViewUniversity: (universityId: string) => void;
  favorites: any[];
  onRemoveFromFavorites: (universityId: string) => void;
}

export function StudentDashboardScreen({ onLogout, onViewUniversity, favorites, onRemoveFromFavorites }: StudentDashboardScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'favorites'>('discover');
  const [studentName, setStudentName] = useState('Student');
  const [universities, setUniversities] = useState<any[]>([]);
  const [allUniversities, setAllUniversities] = useState<any[]>([]);

  const getProgramsList = (programs: any): string[] => {
    if (Array.isArray(programs)) {
      return programs.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof programs === 'string') {
      const normalized = programs.replace(/^\{|\}$/g, '');
      return normalized
        .split(',')
        .map((item) => item.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }

    return [];
  };

  const loadStudentProfile = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

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

      const resolvedName =
        String(profile?.full_name || '').trim() ||
        metadataName ||
        emailFallback ||
        'Student';

      setStudentName(resolvedName);
    } catch (error) {
      console.error(error);
    }
  };

  const applySearchFilters = (source: any[]) => {
    const search = searchQuery.trim().toLowerCase();
    const countryFilter = country.trim().toLowerCase();
    const cityFilter = city.trim().toLowerCase();

    return source.filter((uni) => {
      const name = String(uni?.name || '').toLowerCase();
      const uniCountry = String(uni?.country || '').toLowerCase();
      const uniCity = String(uni?.city || '').toLowerCase();

      if (search && !name.includes(search)) return false;
      if (countryFilter && !uniCountry.includes(countryFilter)) return false;
      if (cityFilter && !uniCity.includes(cityFilter)) return false;
      return true;
    });
  };

  const fetchAllUniversities = async () => {
    try {
      const data = await getUniversities();
      const rows = data || [];
      setAllUniversities(rows);
      setUniversities(applySearchFilters(rows));
    } catch (error: any) {
      alert(error.message || 'Failed to fetch universities');
    }
  };

  const handleSearch = () => {
    setUniversities(applySearchFilters(allUniversities));
  };

  useEffect(() => {
    loadStudentProfile();
    fetchAllUniversities();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, country, city, allUniversities]);

  const totalCountries = useMemo(() => {
    return new Set(
      allUniversities
        .map((uni) => String(uni.country || '').trim())
        .filter(Boolean)
    ).size;
  }, [allUniversities]);

  const totalPrograms = useMemo(() => {
    return allUniversities.reduce((count, university) => {
      return count + getProgramsList(university.programs).length;
    }, 0);
  }, [allUniversities]);

  const tableColumns = [
    { key: 'name', label: 'University Name' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'action', label: 'Action', align: 'right' as const },
  ];

  const tableData = universities.map((uni) => ({
    name: uni.name,
    country: uni.country,
    city: uni.city,
    action: (
      <Button variant="primary" size="sm" onClick={() => onViewUniversity(uni.id)}>
        View Details
      </Button>
    ),
  }));

  return (
    <div className="min-h-screen bg-[#0f0f0f] dark">
      <Navbar userName={studentName} onLogout={onLogout} />

      <main className="p-8">
        <div>
          <div className="mb-8">
            <h1 className="text-white text-3xl mb-2">Student Dashboard</h1>
            <p className="text-[#a0a0a0]">Explore universities and manage your favorites</p>
          </div>

          <div className="flex gap-4 mb-8">
            <Button
              variant={activeTab === 'discover' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('discover')}
            >
              <Globe size={18} className="mr-2" />
              Discover Universities
            </Button>
            <Button
              variant={activeTab === 'favorites' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('favorites')}
            >
              <Heart size={18} className="mr-2" />
              My Favorites ({favorites.length})
            </Button>
          </div>

          {activeTab === 'discover' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card title="Search Universities" className="flex-1">
                <div className="space-y-4">
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={18} />}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      icon={<Globe size={18} />}
                    />
                    <Input
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <Button variant="primary" className="w-full" onClick={handleSearch}>
                    Search
                  </Button>
                </div>
              </Card>

              <Card title="Quick Stats">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                    <span className="text-[#a0a0a0]">Universities Available</span>
                    <span className="text-white text-xl">{allUniversities.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                    <span className="text-[#a0a0a0]">Countries</span>
                    <span className="text-white text-xl">{totalCountries}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                    <span className="text-[#a0a0a0]">Programs</span>
                    <span className="text-white text-xl">{totalPrograms}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'discover' ? (
            <Card title="Available Universities" subtitle="Browse all universities">
              <Table columns={tableColumns} data={tableData} />
            </Card>
          ) : (
            <Card title="My Favorites" subtitle="Universities you saved">
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <Heart size={48} className="mx-auto text-[#a0a0a0] mb-4" />
                  <p className="text-[#a0a0a0] mb-2">No favorites yet</p>
                  <p className="text-[#6a6a6a] text-sm">Start exploring and save universities you like!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">University Name</th>
                        <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Country</th>
                        <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">City</th>
                        <th className="px-4 py-3 text-[#a0a0a0] text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {favorites.map((uni) => (
                        <tr
                          key={uni.id}
                          className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30 transition-colors"
                        >
                          <td className="px-4 py-4 text-white">{uni.name}</td>
                          <td className="px-4 py-4 text-white">{uni.country}</td>
                          <td className="px-4 py-4 text-white">{uni.city}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="primary" size="sm" onClick={() => onViewUniversity(uni.id)}>
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveFromFavorites(uni.id)}
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
