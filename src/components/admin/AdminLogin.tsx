'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, Shield, Zap, Globe, Code, Users } from 'lucide-react';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="min-h-screen flex bg-muted/30">
      {/* Left Panel - Decorative Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-800 overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 mesh-pattern opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/50 via-transparent to-amber-600/20" />

        {/* Animated decorative shapes */}
        <div className="absolute top-20 left-16">
          <motion.div
            className="size-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
            animate={{ rotate: [0, 10, -5, 10, 0], y: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="size-full flex items-center justify-center">
              <Code className="size-7 text-white/70" />
            </div>
          </motion.div>
        </div>

        <div className="absolute top-40 right-20">
          <motion.div
            className="size-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            animate={{ scale: [1, 1.1, 1], y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <div className="size-full flex items-center justify-center">
              <Globe className="size-8 text-white/70" />
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-32 left-24">
          <motion.div
            className="size-14 rounded-xl bg-amber-400/20 backdrop-blur-sm border border-amber-300/20"
            animate={{ rotate: [0, -10, 5, -10, 0], x: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          >
            <div className="size-full flex items-center justify-center">
              <Zap className="size-6 text-amber-300/80" />
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-20 right-32">
          <motion.div
            className="size-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20"
            animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <div className="size-full flex items-center justify-center">
              <Users className="size-5 text-white/60" />
            </div>
          </motion.div>
        </div>

        {/* Large blurred orbs */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="size-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                <Shield className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Lightworld Technologies</h1>
                <p className="text-xs text-amber-200/70">Content Management System</p>
              </div>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Manage Your{' '}
              <span className="bg-gradient-to-r from-amber-200 to-amber-300 bg-clip-text text-transparent">
                Digital Presence
              </span>
            </h2>
            <p className="text-lg text-amber-100/80 max-w-md mb-10 leading-relaxed">
              Access your CMS dashboard to manage blog posts, services, portfolio projects, and more.
            </p>

            {/* Trust indicators */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-100/70">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Shield className="size-4 text-amber-300" />
                </div>
                <span className="text-sm">Secure admin panel with role-based access</span>
              </div>
              <div className="flex items-center gap-3 text-amber-100/70">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Zap className="size-4 text-amber-300" />
                </div>
                <span className="text-sm">Real-time content editing and preview</span>
              </div>
              <div className="flex items-center gap-3 text-amber-100/70">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Globe className="size-4 text-amber-300" />
                </div>
                <span className="text-sm">Manage services, team, and portfolio</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
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
                <div className="size-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-600/20">
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
                  <Label htmlFor="admin-email" className="text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-amber-500" />
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@lightworldtech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`pl-10 transition-all duration-300 ${
                        focusedField === 'email'
                          ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm shadow-amber-400/10'
                          : 'focus-visible:ring-emerald-500/30 focus-visible:border-amber-400'
                      }`}
                      autoComplete="email"
                    />
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 transition-colors duration-300 ${
                      focusedField === 'email' ? 'text-amber-500' : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-amber-500" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`pl-10 pr-10 transition-all duration-300 ${
                        focusedField === 'password'
                          ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm shadow-amber-400/10'
                          : 'focus-visible:ring-emerald-500/30 focus-visible:border-amber-400'
                      }`}
                      autoComplete="current-password"
                    />
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 transition-colors duration-300 ${
                      focusedField === 'password' ? 'text-amber-500' : 'text-muted-foreground'
                    }`} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-600 dark:hover:text-amber-400 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-amber-600/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
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
                <p className="text-xs text-amber-500 dark:text-amber-400 font-medium mb-1">Demo Credentials</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Email: admin@lightworldtech.com
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
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
