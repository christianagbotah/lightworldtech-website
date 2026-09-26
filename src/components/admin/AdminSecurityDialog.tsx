'use client';

import { readJsonResponse } from '@/lib/client-api';
import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

type SecurityStatus = {
  enabled: boolean;
  enrollmentPending: boolean;
  recoveryCodesRemaining: number;
  recoveryEmail: string;
  lastLogin: string | null;
};

type SetupData = {
  secret: string;
  uri: string;
};

type Mode = 'overview' | 'enroll' | 'regenerate' | 'disable' | 'recovery';

export default function AdminSecurityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { logoutAdmin } = useAppStore();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/security/totp', { cache: 'no-store' });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load security settings');
      setStatus(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load security settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setMode('overview');
    setSetup(null);
    setCode('');
    setPassword('');
    setRecoveryCodes([]);
    void loadStatus();
  }, [open]);

  const request = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/admin/security/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload?.error || 'Security update failed');
    return payload.data;
  };

  const beginEnrollment = async () => {
    setLoading(true);
    try {
      const data = await request({ action: 'begin' });
      setSetup({ secret: String(data.secret), uri: String(data.uri) });
      setMode('enroll');
      setCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start MFA enrollment');
    } finally {
      setLoading(false);
    }
  };

  const confirmEnrollment = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const data = await request({ action: 'confirm', code: code.trim() });
      setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      setMode('recovery');
      setCode('');
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify authenticator code');
    } finally {
      setLoading(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const data = await request({ action: 'regenerateRecovery', code: code.trim() });
      setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      setMode('recovery');
      setCode('');
      toast.success('Recovery codes regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to regenerate recovery codes');
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (!password || !code.trim()) return;
    setLoading(true);
    try {
      await request({ action: 'disable', password, code: code.trim() });
      toast.success('Two-factor authentication disabled');
      logoutAdmin();
      window.location.replace('/admin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to disable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const signInAgain = () => {
    logoutAdmin();
    window.location.replace('/admin');
  };

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-muted/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-5 text-amber-600" />
              Authenticator app
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Require a time-based code from an authenticator app in addition to the administrator password.
            </p>
          </div>
          <Badge className={status?.enabled
            ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
            : 'border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}>
            {status?.enabled ? 'Enabled' : 'Not enabled'}
          </Badge>
        </div>

        {status?.enabled ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recovery codes</p>
              <p className="mt-1 text-lg font-bold">{status.recoveryCodesRemaining}</p>
              <p className="text-xs text-muted-foreground">unused codes remaining</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last login</p>
              <p className="mt-2 text-xs font-medium">
                {status.lastLogin ? new Date(status.lastLogin).toLocaleString() : 'Not recorded'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {status?.enabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={() => { setMode('regenerate'); setCode(''); }}>
            <RefreshCw className="mr-2 size-4" /> Regenerate recovery codes
          </Button>
          <Button variant="destructive" onClick={() => { setMode('disable'); setCode(''); setPassword(''); }}>
            <ShieldOff className="mr-2 size-4" /> Disable MFA
          </Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => void beginEnrollment()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Smartphone className="mr-2 size-4" />}
          Set up authenticator app
        </Button>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Security changes invalidate existing administrator sessions. Recovery email: {status?.recoveryEmail || 'not configured'}.
      </p>
    </div>
  );

  const renderEnrollment = () => (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
        <p className="font-semibold text-amber-900 dark:text-amber-200">1. Add Lightworld to your authenticator app</p>
        <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-200/75">
          Choose “enter setup key” in Google Authenticator, Microsoft Authenticator, 1Password, Authy or another TOTP-compatible app.
        </p>
      </div>

      {setup && (
        <>
          <div className="space-y-2">
            <Label>Setup key</Label>
            <div className="flex gap-2">
              <Input readOnly value={setup.secret} className="font-mono tracking-[0.16em]" />
              <Button type="button" variant="outline" size="icon" onClick={() => void copy(setup.secret, 'secret')} aria-label="Copy setup key">
                {copied === 'secret' ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Provisioning URI</Label>
            <div className="flex gap-2">
              <Input readOnly value={setup.uri} className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => void copy(setup.uri, 'uri')} aria-label="Copy provisioning URI">
                {copied === 'uri' ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="mfa-confirm-code">2. Enter the 6-digit code</Label>
        <Input
          id="mfa-confirm-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\s/g, '').slice(0, 12))}
          placeholder="123456"
          className="text-center font-mono text-lg tracking-[0.3em]"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setMode('overview')} disabled={loading}>Cancel</Button>
        <Button type="button" onClick={() => void confirmEnrollment()} disabled={loading || code.replace(/\D/g, '').length !== 6}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Verify and enable
        </Button>
      </DialogFooter>
    </div>
  );

  const renderRecovery = () => (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="size-5" /> Save these recovery codes now
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900/75 dark:text-emerald-200/70">
          Each code works once if you lose access to your authenticator. They will not be shown again.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/20 p-4 font-mono text-sm sm:grid-cols-2">
        {recoveryCodes.map((recoveryCode) => (
          <div key={recoveryCode} className="rounded-lg bg-background px-3 py-2 text-center">
            {recoveryCode}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={() => void copy(recoveryCodes.join('\n'), 'recovery')}>
        {copied === 'recovery' ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
        Copy all recovery codes
      </Button>

      <Button type="button" className="w-full" onClick={signInAgain}>
        I saved the codes — sign in again
      </Button>
    </div>
  );

  const renderRegenerate = () => (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">Regenerate recovery codes</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Enter a current authenticator code or one unused recovery code. Existing recovery codes will stop working.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa-regenerate-code">Authenticator or recovery code</Label>
        <Input id="mfa-regenerate-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setMode('overview')}>Cancel</Button>
        <Button type="button" onClick={() => void regenerateRecoveryCodes()} disabled={loading || !code.trim()}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Regenerate
        </Button>
      </DialogFooter>
    </div>
  );

  const renderDisable = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
        <p className="font-semibold text-rose-900 dark:text-rose-200">Disable two-factor authentication</p>
        <p className="mt-1 text-sm leading-6 text-rose-800/75 dark:text-rose-200/70">
          Confirm with your current password and an authenticator or unused recovery code.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa-disable-password">Current password</Label>
        <Input id="mfa-disable-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa-disable-code">Authenticator or recovery code</Label>
        <Input id="mfa-disable-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setMode('overview')}>Cancel</Button>
        <Button type="button" variant="destructive" onClick={() => void disableMfa()} disabled={loading || !password || !code.trim()}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Disable MFA
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (mode === 'recovery' && !nextOpen) return;
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-amber-600" />
            Administrator security
          </DialogTitle>
        </DialogHeader>

        {loading && !status && mode === 'overview' ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-amber-600" />
          </div>
        ) : mode === 'enroll' ? (
          renderEnrollment()
        ) : mode === 'recovery' ? (
          renderRecovery()
        ) : mode === 'regenerate' ? (
          renderRegenerate()
        ) : mode === 'disable' ? (
          renderDisable()
        ) : (
          renderOverview()
        )}
      </DialogContent>
    </Dialog>
  );
}
