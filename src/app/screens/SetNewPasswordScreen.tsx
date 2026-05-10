import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { updatePasswordAfterRecovery } from '../services/authService';
import { getPasswordPolicyHint } from '../services/passwordPolicy';

interface SetNewPasswordScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

export function SetNewPasswordScreen({ onDone, onCancel }: SetNewPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await updatePasswordAfterRecovery(password);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
      alert('Password updated. Please sign in with your new password.');
      onDone();
    } catch (err: any) {
      alert(err?.message || 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#31A6A8]/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock size={32} className="text-[#31A6A8]" />
          </div>
          <h1 className="text-white text-3xl mb-2 text-center">Set new password</h1>
          <p className="text-[#a0a0a0] text-sm text-center">
            Choose a strong password for your account.
          </p>
        </div>

        <div className="space-y-5">
          <Input
            label="New password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            required
          />
          <p className="text-[#8a8a8a] text-xs leading-relaxed -mt-2">{getPasswordPolicyHint()}</p>

          <Input
            label="Confirm password"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<Lock size={18} />}
            required
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : 'Update password'}
          </Button>

          <Button variant="secondary" size="lg" className="w-full" disabled={submitting} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
