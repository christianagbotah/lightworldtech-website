'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ClientActivatePage({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Use at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/client/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = await readJsonSafely<any>(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to activate account');
      setDone(true);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b10] px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center">
        <Card className="w-full border-white/[0.08] bg-white/[0.035] text-white">
          <CardHeader>
            <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              {done ? <CheckCircle2 className="size-5" /> : <ShieldCheck className="size-5" />}
            </div>
            <CardTitle>{done ? 'Portal account activated' : 'Activate your Lightworld client account'}</CardTitle>
            <p className="text-sm leading-6 text-white/38">
              {done
                ? 'Your password is set. You can now sign in to the secure client workspace.'
                : 'Choose your own password. This one-time activation link expires automatically and cannot be reused after activation.'}
            </p>
          </CardHeader>
          <CardContent>
            {done ? (
              <Button asChild className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                <Link href="/client">Open client portal</Link>
              </Button>
            ) : token ? (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activate-password">New password</Label>
                  <Input
                    id="activate-password"
                    type="password"
                    minLength={10}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activate-confirm">Confirm password</Label>
                  <Input
                    id="activate-confirm"
                    type="password"
                    minLength={10}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="border-white/10 bg-black/20 text-white"
                  />
                </div>
                {error && <p className="text-sm text-rose-300">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
                  Set password & activate
                </Button>
              </form>
            ) : (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
                This activation link is incomplete. Ask your Lightworld contact to generate a new client portal invitation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
