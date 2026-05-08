'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, MapPin, Clock, ChevronRight, CheckCircle2, Loader2, Copy, Check, CalendarDays, MessageCircle, Facebook, Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/use-seo';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard', { description: `${label} copied successfully.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed', { description: 'Could not copy to clipboard.' });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all duration-200 shrink-0"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function useOfficeStatus() {
  const status = useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const day = now.getUTCDay();
    const ghHour = utcHours;

    if (day === 0) return { open: false, label: 'Currently Closed' };
    if (day === 6) {
      if (ghHour >= 9 && ghHour < 13) return { open: true, label: 'Currently Open' };
      return { open: false, label: 'Currently Closed' };
    }
    if (ghHour >= 8 && ghHour < 17) return { open: true, label: 'Currently Open' };
    return { open: false, label: 'Currently Closed' };
  }, []);
  return status;
}

export default function ContactPage() {
  const { navigate } = useAppStore();
  useSEO({
    title: 'Contact',
    description: 'Get in touch with Lightworld Technologies. Contact us for web development, mobile apps, SEO, and IT solutions in Accra, Ghana. +233 (024) 361 8186.',
    keywords: ['contact Lightworld Technologies', 'IT company Accra', 'web development contact', 'tech support Ghana', 'free consultation'],
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const officeStatus = useOfficeStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Message sent successfully!', {
          description: 'We\'ll get back to you within 24 hours.',
        });
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error('Failed to send message', {
          description: 'Something went wrong. Please try again.',
        });
        setError('Something went wrong. Please try again.');
      }
    } catch {
      toast.error('Network error', {
        description: 'Please check your connection and try again.',
      });
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">Contact</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Get In <span className="text-emerald-400">Touch</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Ready to start your next project? We&apos;d love to hear from you. Reach out and let&apos;s discuss how we can help.
          </motion.p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Contact Form */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden relative">
                {/* Gradient accent strip on left */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-emerald-400 to-amber-400 hidden lg:block" />
                <CardContent className="p-6 sm:p-8 relative">
                  {submitted ? (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                      >
                        <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
                      </motion.div>
                      <h3 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Message Sent!</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-2">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
                        Check your email for a confirmation.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => setSubmitted(false)}
                          variant="outline"
                          className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                        >
                          Send Another Message
                        </Button>
                        <Button
                          onClick={() => navigate('home')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Back to Home
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Send Us a Message</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill out the form below and we&apos;ll respond promptly.</p>

                      {/* Form status indicator */}
                      {submitting && (
                        <motion.div
                          className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          <Loader2 className="size-4 animate-spin" />
                          Sending your message...
                        </motion.div>
                      )}

                      {error && (
                        <motion.div
                          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          <CheckCircle2 className="size-4" />
                          {error}
                        </motion.div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-slate-900 dark:text-slate-100 font-medium text-sm flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Full Name
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="John Doe"
                              required
                              disabled={submitting}
                              className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 transition-all h-11"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-slate-900 dark:text-slate-100 font-medium text-sm flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="john@example.com"
                              required
                              disabled={submitting}
                              className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 transition-all h-11"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-slate-900 dark:text-slate-100 font-medium text-sm flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Phone Number
                            </Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+233 XX XXX XXXX"
                              disabled={submitting}
                              className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 transition-all h-11"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="subject" className="text-slate-900 dark:text-slate-100 font-medium text-sm flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Subject
                            </Label>
                            <Input
                              id="subject"
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              placeholder="How can we help?"
                              required
                              disabled={submitting}
                              className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 transition-all h-11"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="message" className="text-slate-900 dark:text-slate-100 font-medium text-sm flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Message
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Tell us about your project..."
                            rows={5}
                            required
                            disabled={submitting}
                            className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 transition-all resize-none"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto px-8 shadow-md hover:shadow-lg transition-shadow"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                Send Message
                                <Send className="size-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px]">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 via-transparent to-amber-400 dark:from-emerald-500 dark:via-transparent dark:to-amber-500" />
                </div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 flex items-center justify-center shrink-0 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300">
                      <Phone className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Phone</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">+233 (024) 361 8186</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">+233 (055) 467 2081</p>
                    </div>
                    <CopyButton text="+233 (024) 361 8186" label="phone number" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px]">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 via-transparent to-amber-400 dark:from-emerald-500 dark:via-transparent dark:to-amber-500" />
                </div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 flex items-center justify-center shrink-0 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300">
                      <Mail className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Email</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">mail@lightworldtech.com</p>
                    </div>
                    <CopyButton text="mail@lightworldtech.com" label="email address" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px]">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 via-transparent to-amber-400 dark:from-emerald-500 dark:via-transparent dark:to-amber-500" />
                </div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 flex items-center justify-center shrink-0 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300">
                      <MapPin className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Office</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Accra<br />Ghana</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px]">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 via-transparent to-amber-400 dark:from-emerald-500 dark:via-transparent dark:to-amber-500" />
                </div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 flex items-center justify-center shrink-0 group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300">
                      <Clock className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Office Hours</h3>
                        <span className="flex items-center gap-1.5">
                          <span className={`relative flex size-2.5 ${officeStatus.open ? '' : 'opacity-50'}`}>
                            {officeStatus.open && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full size-2.5 ${officeStatus.open ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          </span>
                          <span className={`text-xs font-medium ${officeStatus.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {officeStatus.label}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Mon - Fri: 08:00 - 17:00</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sat: 09:00 - 13:00</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sun: Closed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media Links */}
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                      <ExternalLink className="size-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Follow Us</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Stay connected on social media</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-blue-600/25', link: '#' },
                      { icon: Twitter, label: 'Twitter', color: 'hover:bg-sky-500 hover:text-white hover:border-sky-500 hover:shadow-sky-500/25', link: '#' },
                      { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-blue-700 hover:text-white hover:border-blue-700 hover:shadow-blue-700/25', link: '#' },
                      { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-600 hover:text-white hover:border-pink-600 hover:shadow-pink-600/25', link: '#' },
                    ].map((social) => {
                      const SocialIcon = social.icon;
                      return (
                        <button
                          key={social.label}
                          onClick={() => window.open(social.link, '_blank')}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${social.color}`}
                          aria-label={social.label}
                        >
                          <SocialIcon className="size-5" />
                          <span className="text-[10px] font-medium">{social.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Schedule a Call - Prominent design */}
              <Card className="border-0 shadow-lg overflow-hidden relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700">
                <div className="absolute inset-0 grid-pattern opacity-10" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-300/10 rounded-full blur-3xl" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                      <CalendarDays className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">Schedule a Call</h3>
                      <p className="text-xs text-emerald-200/80">Free 30-minute consultation</p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-100/80 mb-5 leading-relaxed">
                    Not sure where to start? Book a free consultation call with our team to discuss your project requirements.
                  </p>
                  <Button
                    className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                    onClick={() => {
                      const message = 'Hello! I would like to schedule a consultation call to discuss a project.';
                      window.open(`https://wa.me/233243618186?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                  >
                    <MessageCircle className="size-4 mr-2" />
                    WhatsApp Us Now
                  </Button>
                </CardContent>
              </Card>

              {/* Google Maps Embed */}
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                <div className="p-3 pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Our Location</h3>
                  </div>
                </div>
                <div className="h-56 rounded-b-lg overflow-hidden">
                  <iframe
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-0.3770%2C5.5837%2C-0.0070%2C5.6237&layer=mapnik&marker=5.6037%2C-0.1870"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lightworld Technologies Office Location - Accra, Ghana"
                    className="grayscale-[30%] contrast-[1.1] dark:grayscale-[60%] dark:brightness-[0.8]"
                  />
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
