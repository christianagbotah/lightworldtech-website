'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, ArrowRight, Facebook, Twitter, Linkedin, Instagram, Send, CheckCircle2, Users, Clock, Heart, ArrowUp } from 'lucide-react';
import Image from 'next/image';
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
  { icon: Facebook, href: '#', label: 'Facebook', hoverColor: 'hover:bg-blue-600 hover:border-blue-600' },
  { icon: Twitter, href: '#', label: 'Twitter', hoverColor: 'hover:bg-sky-500 hover:border-sky-500' },
  { icon: Linkedin, href: '#', label: 'LinkedIn', hoverColor: 'hover:bg-blue-700 hover:border-blue-700' },
  { icon: Instagram, href: '#', label: 'Instagram', hoverColor: 'hover:bg-pink-600 hover:border-pink-600' },
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
    <footer className="bg-slate-900 text-slate-300 relative wave-border-top">
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />

      {/* Newsletter bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300/10 rounded-full blur-2xl" />

        <div className="container-main py-8 flex flex-col md:flex-row items-center justify-between gap-4 relative">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-white">Subscribe to Our Newsletter</h3>
            <p className="text-emerald-100 text-sm flex items-center gap-1.5">
              Get the latest insights, tips, and updates delivered to your inbox.
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-800/50 px-2 py-0.5 rounded-full text-emerald-100 ml-1">
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
                    className="bg-white text-amber-700 font-semibold whitespace-nowrap h-10 px-4"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                    >
                      <CheckCircle2 className="size-5 mr-1 text-emerald-500" />
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
                    className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold whitespace-nowrap h-10"
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

      {/* Request a Free Consultation CTA Card */}
      <div className="container-main pt-8 pb-2">
        <motion.div
          className="relative rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-700 to-amber-600" />
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-300/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Request a Free Consultation</h3>
              <p className="text-emerald-100 text-sm md:text-base max-w-lg mb-4">
                Let&apos;s discuss how we can help transform your business with innovative IT solutions. Our experts are ready to assist you.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-yellow-200" />
                  <span className="font-semibold text-white">+233 (024) 361 8186</span>
                </div>
                <div className="hidden sm:block text-amber-200/40">|</div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-yellow-200" />
                  <span>Mon - Fri: 8:00 AM - 5:00 PM GMT</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate('contact')}
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 px-8 h-12 text-base rounded-xl whitespace-nowrap"
            >
              Get Started
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Main footer content */}
      <div className="container-main py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
                <Image src="/logo.png" alt="Lightworld Technologies" width={32} height={32} className="object-contain p-0.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight text-white">Lightworld</span>
                <span className="text-[10px] font-medium leading-tight text-emerald-400 tracking-wider uppercase">Technologies</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              We are a dynamic team of professionals dedicated to delivering innovative IT solutions that drive business growth and digital transformation.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className={`size-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 transition-all duration-300 ${social.hoverColor} hover:text-white hover:scale-110 hover:shadow-lg hover:-translate-y-0.5`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="size-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 relative">
              Quick Links
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-emerald-400" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 relative">
              Services
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
            </h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <button
                    onClick={() => navigate('services')}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-emerald-400" />
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info + Map */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-5 relative">
              Contact Info
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 group">
                <div className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-300">
                  <MapPin className="size-4 text-emerald-400 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm text-slate-400 pt-1">Accra, Ghana</span>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-300">
                  <Phone className="size-4 text-emerald-400 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm text-slate-400 pt-1">+233 (024) 361 8186</span>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-300">
                  <Mail className="size-4 text-emerald-400 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm text-slate-400 pt-1">mail@lightworldtech.com</span>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-300">
                  <Clock className="size-4 text-emerald-400 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm text-slate-400 pt-1">Mon-Fri: 8AM - 5PM GMT</span>
              </li>
            </ul>
            {/* Map placeholder */}
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-700/50">
              <div className="h-24 bg-gradient-to-br from-slate-800 to-slate-800/80 flex items-center justify-center relative">
                <div className="absolute inset-0 grid-pattern opacity-10" />
                <div className="text-center relative z-10">
                  <MapPin className="size-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-medium">Our Location - Accra, Ghana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bottom Bar */}
      <Separator className="bg-slate-800" />
      <div className="container-main py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <p>&copy; {new Date().getFullYear()} Lightworld Technologies. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
              Made with <Heart className="size-3 text-red-400 fill-red-400" /> in Ghana
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="hover:text-emerald-400 transition-colors">Privacy Policy</button>
            <button className="hover:text-emerald-400 transition-colors">Terms of Service</button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
              aria-label="Back to top"
            >
              <ArrowUp className="size-3" />
              Top
            </button>
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
