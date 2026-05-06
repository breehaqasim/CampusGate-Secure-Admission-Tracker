import { RoleCard } from '../components/RoleCard';
import { GraduationCap, Building2, Shield } from 'lucide-react';

interface RoleSelectionScreenProps {
  onSelectRole: (role: 'student' | 'university-admin' | 'super-admin') => void;
}

export function RoleSelectionScreen({ onSelectRole }: RoleSelectionScreenProps) {
  return (
    <div className="w-full max-w-6xl px-8">
      <div className="text-center mb-12">
        <h1 className="text-white text-4xl mb-3">Select Your Role</h1>
        <p className="text-[#a0a0a0]">Choose how you want to access the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoleCard
          icon={<GraduationCap size={32} />}
          title="Student"
          description="Access courses and learning materials"
          onClick={() => onSelectRole('student')}
        />
        <RoleCard
          icon={<Building2 size={32} />}
          title="University Admin"
          description="Manage courses and student data"
          onClick={() => onSelectRole('university-admin')}
        />
        <RoleCard
          icon={<Shield size={32} />}
          title="Super Admin"
          description="Full system access and control"
          onClick={() => onSelectRole('super-admin')}
        />
      </div>
    </div>
  );
}
