import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface UniversityAdminDashboardScreenProps {
  onLogout: () => void;
  onAddUniversity: () => void;
  onEditUniversity: (universityId: string) => void;
}

export function UniversityAdminDashboardScreen({
  onLogout,
  onAddUniversity,
  onEditUniversity,
}: UniversityAdminDashboardScreenProps) {
  const [universities, setUniversities] = useState([
    { id: '1', name: 'Stanford University', location: 'Stanford, USA', programs: 'Computer Science, Engineering, Business' },
    { id: '2', name: 'MIT', location: 'Cambridge, USA', programs: 'Engineering, Physics, Mathematics' },
    { id: '3', name: 'Harvard University', location: 'Cambridge, USA', programs: 'Law, Medicine, Business, Arts' },
  ]);

  const handleDeleteUniversity = (universityId: string) => {
    if (confirm('Are you sure you want to delete this university?')) {
      setUniversities(prev => prev.filter(uni => uni.id !== universityId));
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] dark">
      <Navbar userName="Admin User" onLogout={onLogout} />

      <main className="p-8">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl mb-2">University Management</h1>
              <p className="text-[#a0a0a0]">Manage your university listings</p>
            </div>
            <Button variant="primary" onClick={onAddUniversity}>
              <Plus size={20} className="mr-2" />
              Add University
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <div className="text-center">
                <p className="text-[#a0a0a0] text-sm mb-2">Total Universities</p>
                <p className="text-4xl text-white">{universities.length}</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-[#a0a0a0] text-sm mb-2">Total Programs</p>
                <p className="text-4xl text-white">45</p>
              </div>
            </Card>
          </div>

          <Card title="Your Universities" subtitle="Add, edit, and delete university information">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">University Name</th>
                    <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Location</th>
                    <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Programs</th>
                    <th className="px-4 py-3 text-[#a0a0a0] text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {universities.map((uni) => (
                    <tr
                      key={uni.id}
                      className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30 transition-colors"
                    >
                      <td className="px-4 py-4 text-white">{uni.name}</td>
                      <td className="px-4 py-4 text-white">{uni.location}</td>
                      <td className="px-4 py-4 text-white">{uni.programs}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" size="sm" onClick={() => onEditUniversity(uni.id)}>
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUniversity(uni.id)}
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 size={16} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
