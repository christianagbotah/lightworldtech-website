'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, MapPin, Clock, CheckCircle2, Loader2, Copy, Check, CalendarDays, MessageCircle, Facebook, Twitter, Linkedin, Instagram, ExternalLink, Upload, X, FileText, Image as ImageIcon, File, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/use-seo';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon;
  if (type === 'application/pdf') return FileText;
  return File;
}

function getFileColor(type: string): string {
  if (type.startsWith('image/')) return 'bg-amber-100 dark:bg-amber-900/30 text-emerald-400';
  if (type === 'application/pdf') return 'bg-red-100 dark:bg-red-900/30 text-red-400';
  return 'dark:bg-white/[0.06] bg-slate-100 dark:text-white/60 text-slate-500';
}

interface FileAttachment {
  id: string;
  file: File;
  preview?: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!', { description: `${label} copied.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-md dark:text-white/40 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0" aria-label={`Copy ${label}`}>
      {copied ? <Check className="size-3 text-amber-500" /> : <Copy className="size-3" />}
    </button>
  );
}

function useOfficeStatus() {
  const status = useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const day = now.getUTCDay();
    if (day === 0) return { open: false, label: 'Closed' };
    if (day === 6) { if (utcHours >= 9 && utcHours < 13) return { open: true, label: 'Open' }; return { open: false, label: 'Closed' }; }
    if (utcHours >= 8 && utcHours < 17) return { open: true, label: 'Open' };
    return { open: false, label: 'Closed' };
  }, []);
  return status;
}

export default function ContactPage() {
  const { navigate } = useAppStore();
  useSEO({
    title: 'Contact',
    description: 'Get in touch with Lightworld Technologies for web development, mobile apps, SEO, and IT solutions in Accra, Ghana.',
    keywords: ['contact Lightworld Technologies', 'IT company Accra', 'web development contact'],
  });

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const officeStatus = useOfficeStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const totalSize = useMemo(() => attachments.reduce((sum, f) => sum + f.file.size, 0), [attachments]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    if (attachments.length + fileArray.length > MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); return; }
    const oversized = fileArray.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) toast.error('File too large (max 10MB)');
    const validFiles = fileArray.filter(f => {
      if (f.size > MAX_FILE_SIZE) return false;
      if (totalSize + f.size > MAX_TOTAL_SIZE) return false;
      if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|txt|zip|xls|xlsx)$/i)) return false;
      return true;
    });
    if (validFiles.length === 0 && fileArray.length > 0) toast.error('Invalid file type');
    const newAttachments: FileAttachment[] = validFiles.map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      let preview: string | undefined;
      if (file.type.startsWith('image/')) preview = URL.createObjectURL(file);
      return { id, file, preview };
    });
    setAttachments([...attachments, ...newAttachments]);
  }, [attachments, setAttachments, totalSize]);

  const removeFile = useCallback((id: string) => {
    const file = attachments.find(f => f.id === id);
    if (file?.preview) URL.revokeObjectURL(file.preview);
    setAttachments(attachments.filter(f => f.id !== id));
  }, [attachments, setAttachments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachments: attachments.map(a => ({ name: a.file.name, size: a.file.size, type: a.file.type })),
        }),
      });
      if (res.ok) {
        toast.success('Message sent!', { description: "We'll respond within 24 hours." });
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        attachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
        setAttachments([]);
      } else {
        toast.error('Failed to send');
        setError('Something went wrong.');
      }
    } catch {
      toast.error('Network error');
      setError('Check your connection.');
    } finally { setSubmitting(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const contactItems = [
    { icon: Phone, label: 'Phone', value: '+233 (024) 361 8186', copy: '+233 (024) 361 8186' },
    { icon: Mail, label: 'Email', value: 'mail@lightworldtech.com', copy: 'mail@lightworldtech.com' },
    { icon: MapPin, label: 'Location', value: 'Accra, Ghana', copy: '' },
    { icon: Clock, label: 'Hours', value: 'Mon-Fri: 8AM-5PM', copy: '' },
  ];

  return (
    <div className="h-[calc(100vh-5rem)] overflow-hidden bg-background flex flex-col">
      {/* ═══ Compact Title Bar ═══ */}
      <div className="shrink-0 px-4 lg:px-8 pt-2 pb-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="size-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.2em]">Contact</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold dark:text-white text-slate-900">
            Get in <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Touch</span>
          </h1>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06]">
            <span className={`relative flex size-2 ${officeStatus.open ? '' : 'opacity-50'}`}>
              {officeStatus.open && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full size-2 ${officeStatus.open ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </span>
            <span className="text-xs dark:text-white/50 text-slate-500 font-medium">{officeStatus.label}</span>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 min-h-0 px-4 lg:px-8 pb-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
        {/* ── Left: Contact Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0 rounded-xl dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] backdrop-blur-sm p-4 lg:p-6 flex flex-col overflow-hidden">
            {submitted ? (
              <div className="flex-1 flex items-center justify-center">
                <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <motion.div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}>
                    <CheckCircle2 className="size-8 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-1">Message Sent!</h3>
                  <p className="text-xs dark:text-white/40 text-slate-500 mb-4">We&apos;ll respond within 24 hours.</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setSubmitted(false)} variant="outline" size="sm" className="text-xs border-slate-300 dark:border-white/[0.1]">Send Another</Button>
                    <Button onClick={() => navigate('home')} size="sm" className="text-xs bg-emerald-500">Back Home</Button>
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <h2 className="text-sm lg:text-base font-bold dark:text-white text-slate-900 mb-3 lg:mb-4">Send a Message</h2>

                {submitting && (
                  <motion.div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-1.5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <Loader2 className="size-3 animate-spin" /> Sending...
                  </motion.div>
                )}
                {error && (
                  <motion.div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-1.5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <AlertCircle className="size-3" /> {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="name" className="text-xs dark:text-white/40 text-slate-500 font-medium mb-0.5 block">Full Name *</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required disabled={submitting} className="h-9 text-xs dark:bg-white/[0.04] bg-slate-50 border-slate-200 dark:border-white/[0.08] dark:text-white text-slate-900 placeholder:dark:text-white/20 placeholder:text-slate-400 focus-visible:border-emerald-500/50" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs dark:text-white/40 text-slate-500 font-medium mb-0.5 block">Email *</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required disabled={submitting} className="h-9 text-xs dark:bg-white/[0.04] bg-slate-50 border-slate-200 dark:border-white/[0.08] dark:text-white text-slate-900 placeholder:dark:text-white/20 placeholder:text-slate-400 focus-visible:border-emerald-500/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="phone" className="text-xs dark:text-white/40 text-slate-500 font-medium mb-0.5 block">Phone</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+233 XX XXX XXXX" disabled={submitting} className="h-9 text-xs dark:bg-white/[0.04] bg-slate-50 border-slate-200 dark:border-white/[0.08] dark:text-white text-slate-900 placeholder:dark:text-white/20 placeholder:text-slate-400 focus-visible:border-emerald-500/50" />
                    </div>
                    <div>
                      <Label htmlFor="subject" className="text-xs dark:text-white/40 text-slate-500 font-medium mb-0.5 block">Subject *</Label>
                      <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="How can we help?" required disabled={submitting} className="h-9 text-xs dark:bg-white/[0.04] bg-slate-50 border-slate-200 dark:border-white/[0.08] dark:text-white text-slate-900 placeholder:dark:text-white/20 placeholder:text-slate-400 focus-visible:border-emerald-500/50" />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Label htmlFor="message" className="text-xs dark:text-white/40 text-slate-500 font-medium mb-0.5 block">Message *</Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Tell us about your project..." required disabled={submitting} className="flex-1 min-h-[80px] text-xs dark:bg-white/[0.04] bg-slate-50 border-slate-200 dark:border-white/[0.08] dark:text-white text-slate-900 placeholder:dark:text-white/20 placeholder:text-slate-400 resize-none focus-visible:border-emerald-500/50" />
                  </div>

                  {/* File Upload (compact) */}
                  <div
                    className={`border border-dashed rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-all ${
                      isDragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-white/[0.06] dark:hover:border-white/[0.12] hover:border-slate-300'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
                    onClick={() => inputRef.current?.click()}
                  >
                    <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.txt,.zip,.xls,.xlsx" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} className="hidden" />
                    <Upload className="size-3.5 dark:text-white/40 text-slate-500 shrink-0" />
                    <span className="text-xs dark:text-white/45 text-slate-500">Attach files (max {MAX_FILES}, 10MB each)</span>
                  </div>

                  {/* File chips */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-1 px-2 py-0.5 rounded-md dark:bg-white/[0.04] bg-slate-50 border border-slate-200 dark:border-white/[0.06] text-xs dark:text-white/50 text-slate-500">
                          {att.file.name} ({formatFileSize(att.file.size)})
                          <button onClick={() => removeFile(att.id)} className="dark:text-white/40 text-slate-500 hover:text-red-400 ml-0.5"><X className="size-2.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit */}
                  <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold h-9 shadow-lg shadow-emerald-500/20 shrink-0">
                    {submitting ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Sending...</> : <>Send Message <Send className="size-3.5 ml-1.5" /></>}
                  </Button>
                </form>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Right: Contact Info ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-5 flex flex-col gap-2 lg:gap-2.5 min-h-0 overflow-y-auto"
        >
          {/* Contact Info Cards */}
          <div className="grid grid-cols-2 gap-2">
            {contactItems.map((item) => (
              <div key={item.label} className="group p-3 lg:p-4 rounded-lg dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] dark:hover:bg-white/[0.06] hover:bg-slate-100 dark:hover:border-white/[0.12] hover:border-slate-300 transition-all">
                <div className="flex items-start gap-2">
                  <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <item.icon className="size-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs lg:text-sm font-semibold dark:text-white/50 text-slate-500 uppercase tracking-wider">{item.label}</span>
                    <span className="block text-xs lg:text-sm dark:text-white/65 text-slate-600 mt-0.5">{item.value}</span>
                  </div>
                  {item.copy && <CopyButton text={item.copy} label={item.label} />}
                </div>
              </div>
            ))}
          </div>

          {/* Social Media */}
          <div className="p-3 lg:p-4 rounded-lg dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06]">
            <span className="block text-xs font-semibold dark:text-white/50 text-slate-500 uppercase tracking-wider mb-2">Follow Us</span>
            <div className="flex items-center gap-2">
              {[
                { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-600' },
                { icon: Twitter, label: 'Twitter', color: 'hover:bg-sky-500' },
                { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-blue-700' },
                { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-600' },
              ].map((social) => (
                <button key={social.label} onClick={() => window.open('#', '_blank')} className={`size-8 rounded-lg border border-slate-200 dark:border-white/[0.06] dark:text-white/30 text-slate-400 flex items-center justify-center transition-all hover:text-white hover:shadow-lg ${social.color}`} aria-label={social.label}>
                  <social.icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Schedule a Call */}
          <div className="relative p-3 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-10" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <CalendarDays className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-white">Free Consultation</h3>
                <p className="text-xs text-amber-100/70">30-minute call with our team</p>
              </div>
              <Button
                size="sm"
                className="bg-white text-amber-600 hover:bg-amber-50 font-semibold text-xs h-7 px-3 shrink-0"
                onClick={() => window.open('https://wa.me/233243618186?text=Hello!%20I%20would%20like%20to%20schedule%20a%20consultation%20call.', '_blank')}
              >
                <MessageCircle className="size-3 mr-1" /> WhatsApp
              </Button>
            </div>
          </div>

          {/* Map Preview */}
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.06] flex-1 min-h-[100px]">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=-0.3770%2C5.5837%2C-0.0070%2C5.6237&layer=mapnik&marker=5.6037%2C-0.1870"
              width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              title="Lightworld Technologies Office - Accra, Ghana"
              className="grayscale-[50%] contrast-[1.1] dark:brightness-[0.7] h-full"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
