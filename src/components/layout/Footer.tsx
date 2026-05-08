'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Phone, Mail, MapPin, ArrowRight, Facebook, Twitter, Linkedin, Instagram, Send, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const quickLinks = [
  { label: 'Home', page: 'home' as const },
  { label: 'About Us', page: 'about' as const },
  { label: 'Our Services', page: 'services' as const },
  { label: 'Portfolio', page: 'portfolio' as const },
  { label: 'Blog', page: 'blog' as const },
  { label: 'Contact Us', page: 'contact' as const },
];

const serviceLinks = [
  'Web Development',
  'Mobile App Development',
  'Skills Training',
  'SEO & Marketing',
  'Software Development',
  'Web Hosting',
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

export default function Footer() {
  const { navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (value: string) => {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      return result.error.issues[0].message;
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      setEmailTouched(true);
      return;
    }

    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      toast.success('Successfully subscribed!', {
        description: 'You\'ll receive our latest updates and insights.',
      });
      setSubscribed(true);
      setEmail('');
      setEmailError('');
      setEmailTouched(false);
      setTimeout(() => setSubscribed(false), 4000);
    } catch {
      toast.error('Subscription failed', {
        description: 'Please try again later.',
      });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Newsletter bar */}
      <div className="bg-emerald-600">
        <div className="container-main py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-white">Subscribe to Our Newsletter</h3>
            <p className="text-emerald-100 text-sm flex items-center gap-1.5">
              Get the latest insights, tips, and updates delivered to your inbox.
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-700/50 px-2 py-0.5 rounded-full text-emerald-100 ml-1">
                <Users className="size-3" />
                500+ subscribers
              </span>
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-72">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                className={`pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 ${
                  emailError ? 'border-red-400' : 'border-white/20'
                }`}
                required
              />
            </div>
            <AnimatePresence mode="wait">
              {subscribed ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Button
                    type="button"
                    disabled
                    className="bg-amber-500 text-slate-900 font-semibold whitespace-nowrap h-10 px-4"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                    >
                      <CheckCircle2 className="size-5 mr-1 text-emerald-700" />
                    </motion.div>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      Subscribed!
                    </motion.span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    type="submit"
                    variant="secondary"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold whitespace-nowrap h-10"
                  >
                    Subscribe
                    <Send className="size-4 ml-1" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
        {/* Inline email error */}
        <AnimatePresence>
          {emailError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="container-main pb-4">
                <p className="text-xs text-red-200">{emailError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main footer content */}
      <div className="container-main py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Zap className="size-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight text-white">Lightworld</span>
                <span className="text-[10px] font-medium leading-tight text-emerald-400 tracking-wider uppercase">Technologies</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              We are a dynamic team of professionals dedicated to delivering innovative IT solutions that drive business growth and digital transformation.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="size-9 rounded-full bg-slate-800 hover:bg-emerald-600 flex items-center justify-center transition-colors"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <button
                    onClick={() => navigate('services')}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-400">Accra, Ghana</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-400">+233 (024) 361 8186</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-400">mail@lightworldtech.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <Separator className="bg-slate-800" />
      <div className="container-main py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Lightworld Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button className="hover:text-emerald-400 transition-colors">Privacy Policy</button>
            <button className="hover:text-emerald-400 transition-colors">Terms of Service</button>
            <button
              onClick={() => navigate('admin-dashboard')}
              className="hover:text-emerald-400 transition-colors"
              aria-label="Admin Panel"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
