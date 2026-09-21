'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ClientResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('This reset link is incomplete. Request a new reset link from the client sign-in page.');
      return;
    }

    if (password.length < 12) {
      setError('Use at least 12 characters for the new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/client/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Unable to reset the password.');
        return;
      }

      setSuccess(data.message || 'Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
      setToken('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050b10] px-4 py-16 text-white">
      <div className="mx-auto flex min-h-[75vh] max-w-lg items-center">
        <Card className="w-full border-amber-400/10 bg-white/[0.04] text-white shadow-2xl">
          <CardContent className="p-7 sm:p-9">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Reset client portal password</h1>
                <p className="text-sm text-white/45">Lightworld Technologies</p>
              </div>
            </div>

            {success ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <ShieldCheck className="size-4" />
                    Password reset complete
                  </div>
                  {success}
                </div>
                <Button asChild className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">
                  <Link href="/client">Return to client sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <p className="text-sm leading-6 text-white/55">
                  Choose a new password with at least 12 characters. Completing the reset signs out older client portal sessions.
                </p>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="client-new-password" className="text-white/80">New password</Label>
                  <div className="relative">
                    <Input
                      id="client-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      className="border-white/10 bg-white/5 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-amber-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-confirm-password" className="text-white/80">Confirm new password</Label>
                  <Input
                    id="client-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    className="border-white/10 bg-white/5"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Set new password'
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/client" className="text-sm text-white/45 hover:text-amber-300">
                    Back to client sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
