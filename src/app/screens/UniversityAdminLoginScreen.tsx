import { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Building2, Mail, Lock } from 'lucide-react';
import { loginUser } from '../services/authService';

interface UniversityAdminLoginScreenProps {
  onBack: () => void;
  onRegisterClick: () => void;
  onLogin: () => void;
}

export function UniversityAdminLoginScreen({ onBack, onRegisterClick, onLogin }: UniversityAdminLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const profile = await loginUser(email, password);

      if (profile.role !== 'university-admin') {
        alert('Access denied. This login is only for university admins.');
        return;
      }

      if (!profile.approved) {
        alert('Your admin request is pending approval from Super Admin.');
        return;
      }

      onLogin();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <>
      <BackButton onClick={onBack} />
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#31A6A8]/10 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={32} className="text-[#31A6A8]" />
            </div>
            <h1 className="text-white text-3xl mb-2">University Admin Login</h1>
            <p className="text-[#a0a0a0] text-sm">Access administrative dashboard</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={18} />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#a0a0a0] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#3a3a3a] bg-[#2a2a2a] text-[#31A6A8] focus:ring-2 focus:ring-[#31A6A8]/20"
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-[#31A6A8] hover:text-[#2a9395] transition-colors">
                Forgot password?
              </a>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleLogin}
              className="w-full"
            >
              Login
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[#a0a0a0] text-sm">
              <button onClick={onRegisterClick} className="text-[#31A6A8] hover:text-[#2a9395] transition-colors">
                Register as University Admin
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[#6a6a6a] text-xs mt-6">
          Admin access requires approval
        </p>
      </div>
    </>
  );
}
