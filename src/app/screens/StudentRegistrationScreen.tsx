import { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { GraduationCap, Mail, Lock, User } from 'lucide-react';
import { signUpStudent } from '../services/authService';
import { checkRateLimit, isValidEmail, validateStrongPassword } from '../services/securityService';

interface StudentRegistrationScreenProps {
  onBack: () => void;
  onLoginClick: () => void;
  onSignUp: () => void;
}

export function StudentRegistrationScreen({ onBack, onLoginClick, onSignUp }: StudentRegistrationScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // const handleSignUp = () => {
  //   console.log('Student registration attempted with:', { fullName, email, password });
  //   onSignUp();
  // };
  const handleSignUp = async () => {
  if (!fullName.trim() || !email.trim() || !password) {
    alert('Please fill all required fields.');
    return;
  }
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  const passwordIssue = validateStrongPassword(password);
  if (passwordIssue) {
    alert(passwordIssue);
    return;
  }
  const registrationLimit = checkRateLimit(`student-register:${email.toLowerCase()}`, 5, 10 * 60 * 1000);
  if (!registrationLimit.allowed) {
    alert('Too many signup attempts. Please try again in a few minutes.');
    return;
  }

  try {
    await signUpStudent(fullName, email, password);
    alert('Student account created successfully');
    onSignUp();
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
              <GraduationCap size={32} className="text-[#31A6A8]" />
            </div>
            <h1 className="text-white text-3xl mb-2">Student Registration</h1>
            <p className="text-[#a0a0a0] text-sm">Create your learning account</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User size={18} />}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="student@university.edu"
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

            <Button
              variant="primary"
              size="lg"
              onClick={handleSignUp}
              className="w-full mt-6"
            >
              Sign Up
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
          By signing up, you agree to our Terms of Service
        </p>
      </div>
    </>
  );
}
