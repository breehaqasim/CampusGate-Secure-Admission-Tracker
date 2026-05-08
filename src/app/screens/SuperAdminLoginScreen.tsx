import { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Shield, Mail, Lock } from 'lucide-react';
import {
  loginUser,
  logoutUser,
  requestPasswordReset,
  sendEmailOtpForPrivilegedLogin,
  verifyEmailOtpForPrivilegedLogin,
} from '../services/authService';
import { checkRateLimit, isValidEmail, normalizeEmail } from '../services/securityService';

interface SuperAdminLoginScreenProps {
  onBack: () => void;
  onLogin: () => void;
}

export function SuperAdminLoginScreen({ onBack, onLogin }: SuperAdminLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // const handleLogin = () => {
  //   console.log('Super Admin login attempted with:', { email, password });
  //   onLogin();
  // };
  const handleLogin = async () => {
  if (!isValidEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  const loginLimit = checkRateLimit(`super-login:${normalizeEmail(email)}`, 8, 10 * 60 * 1000);
  if (!loginLimit.allowed) {
    alert('Too many login attempts. Please wait before trying again.');
    return;
  }

  try {
    const profile = await loginUser(email, password);

    if (profile.role !== 'super-admin') {
      alert('Access denied. This login is only for super admin.');
      return;
    }

    // Step-up authentication for privileged role via email OTP.
    await logoutUser();
    await sendEmailOtpForPrivilegedLogin(email);
    const otp = prompt('Enter the OTP code sent to your email to complete login:');
    if (!otp) {
      alert('OTP is required to complete login.');
      return;
    }
    const otpLimit = checkRateLimit(`super-otp:${normalizeEmail(email)}`, 5, 10 * 60 * 1000);
    if (!otpLimit.allowed) {
      alert('Too many OTP attempts. Please request login again.');
      return;
    }
    await verifyEmailOtpForPrivilegedLogin(email, otp, 'super-admin');

    onLogin();
  } catch (error: any) {
    alert(error.message);
  }
};

  const handleForgotPassword = async () => {
    const targetEmail = email.trim() || prompt('Enter your email for reset link:') || '';
    if (!targetEmail) return;

    const resetLimit = checkRateLimit(`super-reset:${normalizeEmail(targetEmail)}`, 3, 15 * 60 * 1000);
    if (!resetLimit.allowed) {
      alert('Too many reset requests. Please try again later.');
      return;
    }

    try {
      await requestPasswordReset(targetEmail);
      alert('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      alert(error.message || 'Failed to send password reset email.');
    }
  };

  return (
    <>
      <BackButton onClick={onBack} />
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#31A6A8]/10 rounded-2xl flex items-center justify-center mb-4">
              <Shield size={32} className="text-[#31A6A8]" />
            </div>
            <h1 className="text-white text-3xl mb-2">Super Admin Login</h1>
            <p className="text-[#a0a0a0] text-sm">System administrator access</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@system.com"
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
              <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} className="text-[#31A6A8] hover:text-[#2a9395] transition-colors">
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
        </div>

        <p className="text-center text-[#6a6a6a] text-xs mt-6">
          Highest level system access - handle with care
        </p>
      </div>
    </>
  );
}
