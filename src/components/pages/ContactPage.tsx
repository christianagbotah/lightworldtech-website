'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, MapPin, Clock, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function ContactPage() {
  const { navigate } = useAppStore();
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
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Message Sent!</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                      <Button
                        onClick={() => setSubmitted(false)}
                        variant="outline"
                        className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Send Us a Message</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill out the form below and we&apos;ll respond promptly.</p>

                      {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-900 dark:text-slate-100">Full Name *</Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="John Doe"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-900 dark:text-slate-100">Email Address *</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="john@example.com"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-slate-900 dark:text-slate-100">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+233 XX XXX XXXX"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject" className="text-slate-900 dark:text-slate-100">Subject *</Label>
                            <Input
                              id="subject"
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              placeholder="How can we help?"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-slate-900 dark:text-slate-100">Message *</Label>
                          <Textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Tell us about your project..."
                            rows={5}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto px-8"
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
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Phone className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Phone</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">+233 (024) 361 8186</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">+233 (055) 467 2081</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Mail className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Email</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">mail@lightworldtech.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Office</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Accra<br />Ghana</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Clock className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-slate-900 dark:text-white">Office Hours</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Mon - Fri: 08:00 - 17:00</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sat: 09:00 - 13:00</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sun: Closed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map Placeholder */}
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 relative flex items-center justify-center">
                  <div className="absolute inset-0 grid-pattern opacity-30" />
                  <div className="text-center relative z-10">
                    <MapPin className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Interactive Map</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Accra, Ghana</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
