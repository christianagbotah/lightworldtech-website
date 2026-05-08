'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function AdminLogin() {
  const { navigate, loginAdmin } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        loginAdmin(data.data.name || 'Admin');
        toast.success('Welcome back!', { description: 'Logged in successfully.' });
      } else {
        setError(data.error || 'Invalid email or password');
        toast.error('Login failed', { description: data.error || 'Invalid email or password' });
      }
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error', { description: 'Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back button */}
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="size-4" />
            Back to Website
          </button>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <Shield className="size-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
                  <p className="text-xs text-muted-foreground">Lightworld Technologies</p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to access the CMS dashboard</p>
              </div>

              {error && (
                <motion.div
                  className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@lightworldtech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-shadow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Demo credentials hint */}
              <div className="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Demo Credentials</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Email: admin@lightworldtech.com
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Password: admin123
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Lightworld Technologies. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
