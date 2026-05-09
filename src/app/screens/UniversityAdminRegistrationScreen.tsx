import { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Building2, Mail, Lock, User, School, MapPin, Globe } from 'lucide-react';
import { requestUniversityAdmin } from '../services/authService';

interface UniversityAdminRegistrationScreenProps {
  onBack: () => void;
  onLoginClick: () => void;
}

export function UniversityAdminRegistrationScreen({ onBack, onLoginClick }: UniversityAdminRegistrationScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [universityCity, setUniversityCity] = useState('');
  const [universityCountry, setUniversityCountry] = useState('');

  // const handleSubmitRequest = () => {
  //   console.log('Admin registration request submitted:', { fullName, email, password, universityName });
  // };
  const handleSubmitRequest = async () => {
    try {
      await requestUniversityAdmin(
        fullName,
        email,
        password,
        universityName,
        universityCity,
        universityCountry
      );
      alert('Request submitted. Wait for Super Admin approval.');
      onLoginClick();
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
            <h1 className="text-white text-3xl mb-2 text-center">University Admin Registration</h1>
            <p className="text-[#a0a0a0] text-sm">Request administrative access</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User size={18} />}
            />

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
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
            />

            <Input
              label="University Name"
              type="text"
              placeholder="Enter your university"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              icon={<School size={18} />}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                type="text"
                placeholder="e.g., Lahore"
                value={universityCity}
                onChange={(e) => setUniversityCity(e.target.value)}
                icon={<MapPin size={18} />}
              />
              <Input
                label="Country"
                type="text"
                placeholder="e.g., Pakistan"
                value={universityCountry}
                onChange={(e) => setUniversityCountry(e.target.value)}
                icon={<Globe size={18} />}
              />
            </div>

            <div className="bg-[#31A6A8]/5 border border-[#31A6A8]/20 rounded-lg p-4 mt-4">
              <p className="text-[#a0a0a0] text-sm leading-relaxed">
                Your request will be reviewed by Super Admin before access is granted.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => void handleSubmitRequest()}
              className="w-full"
            >
              Submit Request
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[#a0a0a0] text-sm">
              Already have an account?{' '}
              <button onClick={onLoginClick} className="text-[#31A6A8] hover:text-[#2a9395] transition-colors">
                Login
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[#6a6a6a] text-xs mt-6">
          Approval typically takes 24-48 hours
        </p>
      </div>
    </>
  );
}
