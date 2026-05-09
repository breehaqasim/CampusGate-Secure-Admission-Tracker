import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import {
  completeLoginWithEmailOtp,
  normalizeEmail,
  resendLoginEmailOtp,
  type PortalRole,
} from '../services/authService';

interface EmailOtpChallengeProps {
  email: string;
  expectedRole: PortalRole;
  onVerified: (profile: any) => void;
  onCancel: () => void;
}

export function EmailOtpChallenge({ email, expectedRole, onVerified, onCancel }: EmailOtpChallengeProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    try {
      setBusy(true);
      const profile = await completeLoginWithEmailOtp(email, code, expectedRole);
      onVerified(profile);
    } catch (err: any) {
      alert(err?.message || 'Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    try {
      setBusy(true);
      await resendLoginEmailOtp(email);
      alert('A new login code was sent to your email.');
    } catch (err: any) {
      alert(err?.message || 'Could not resend code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[#a0a0a0] text-sm leading-relaxed">
        We sent a one-time login code to{' '}
        <span className="text-white font-medium">{normalizeEmail(email)}</span>. Enter it below (check spam).
      </p>
      <Input
        label="Email code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Code from email"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        icon={<Mail size={18} />}
      />
      <p className="text-[#6a6a6a] text-xs leading-relaxed">
        In Supabase → Authentication → Emails → Magic Link, include {'{{ .Token }}'} in the template so the code appears in the message.
      </p>
      <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={() => void handleVerify()}>
        {busy ? 'Verifying…' : 'Verify & continue'}
      </Button>
      <Button variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => void handleResend()}>
        Resend code
      </Button>
      <button
        type="button"
        className="text-[#31A6A8] hover:text-[#2a9395] text-sm w-full text-center transition-colors"
        onClick={onCancel}
      >
        Back to password
      </button>
    </div>
  );
}
