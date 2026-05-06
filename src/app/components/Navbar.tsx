import { LogOut } from 'lucide-react';
import { Button } from './Button';

interface NavbarProps {
  userName?: string;
  onLogout: () => void;
}

export function Navbar({ userName = 'User', onLogout }: NavbarProps) {
  return (
    <nav className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#31A6A8] rounded-lg flex items-center justify-center">
            <span className="text-white text-xl">🎓</span>
          </div>
          <h1 className="text-white text-xl">CampusGate: Secure Admission Tracker</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[#a0a0a0]">Welcome, <span className="text-white">{userName}</span></span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
