'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, DollarSign, Briefcase,
  Send, Loader2, CheckCircle2,
  X, Building2, Upload, FileText, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { useSEO } from '@/hooks/use-seo';
import { toast } from 'sonner';
import CTASection from '@/components/sections/CTASection';

interface JobListing {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salaryRange: string;
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
  featured: boolean;
  image?: string;
}

const defaultJobs: JobListing[] = [
  {
    id: '1',
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'Accra, Ghana',
    type: 'Full-time',
    salaryRange: 'GHS 8,000 – GHS 14,000/mo',
    description: 'We are looking for an experienced Full-Stack Developer to lead the development of our enterprise web applications. You will work with modern technologies including React, Next.js, Node.js, and PostgreSQL to build scalable solutions for our clients across Africa.',
    requirements: [
      '5+ years of professional software development experience',
      'Expert knowledge of React, Next.js, and TypeScript',
      'Strong backend experience with Node.js and Python',
      'Experience with relational databases (PostgreSQL, MySQL)',
      'Familiarity with cloud platforms (AWS, GCP, Azure)',
      'Strong problem-solving and communication skills',
      'Experience leading small development teams is a plus',
    ],
    benefits: [
      'Competitive salary with annual performance bonus',
      'Health insurance and wellness allowance',
      'Flexible working hours with remote options',
      'Professional development budget (GHS 3,000/year)',
      'Latest MacBook Pro and equipment provided',
      'Annual team retreats and company events',
    ],
    postedDate: '2025-01-10',
    featured: true,
    image: '/images/careers/developer.png',
  },
  {
    id: '2',
    title: 'Mobile App Developer (React Native)',
    department: 'Engineering',
    location: 'Accra, Ghana',
    type: 'Full-time',
    salaryRange: 'GHS 6,000 – GHS 10,000/mo',
    description: 'Join our mobile development team to build cross-platform applications for iOS and Android using React Native. You will work on exciting projects spanning fintech, healthcare, and e-commerce industries.',
    requirements: [
      '3+ years of mobile app development experience',
      'Strong proficiency in React Native and TypeScript',
      'Experience with native iOS (Swift) or Android (Kotlin)',
      'Knowledge of mobile UI/UX best practices',
      'Experience with RESTful APIs and GraphQL',
      'Familiarity with CI/CD pipelines for mobile apps',
      'Published apps on App Store or Google Play',
    ],
    benefits: [
      'Competitive salary and performance bonuses',
      'Health insurance coverage',
      'Flexible hybrid work arrangement',
      'Conference attendance sponsorship',
      'Modern development tools and equipment',
    ],
    postedDate: '2025-01-08',
    featured: true,
    image: '/images/careers/developer.png',
  },
  {
    id: '3',
    title: 'UI/UX Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    salaryRange: 'GHS 5,000 – GHS 9,000/mo',
    description: 'We are seeking a talented UI/UX Designer to craft beautiful and intuitive digital experiences. You will collaborate closely with developers and product managers to translate user needs into elegant design solutions.',
    requirements: [
      '3+ years of UI/UX design experience',
      'Proficiency in Figma and Adobe Creative Suite',
      'Strong portfolio demonstrating user-centered design',
      'Experience with design systems and component libraries',
      'Knowledge of accessibility standards (WCAG)',
      'Understanding of responsive and mobile-first design',
      'User research and usability testing experience',
    ],
    benefits: [
      'Competitive salary with creative freedom',
      'Figma Professional license provided',
      'Flexible remote-first work culture',
      'Annual design conference budget',
      'Wellness and mental health support',
    ],
    postedDate: '2025-01-05',
    featured: false,
    image: '/images/careers/designer.png',
  },
  {
    id: '4',
    title: 'Digital Marketing Specialist',
    department: 'Marketing',
    location: 'Accra, Ghana',
    type: 'Full-time',
    salaryRange: 'GHS 3,500 – GHS 6,000/mo',
    description: 'Help our clients grow their online presence through strategic digital marketing campaigns. You will manage SEO, PPC advertising, social media marketing, and content strategies for diverse business clients.',
    requirements: [
      '2+ years of digital marketing experience',
      'Strong knowledge of SEO/SEM best practices',
      'Experience with Google Ads, Meta Ads, and analytics tools',
      'Social media management and content creation skills',
      'Experience with email marketing platforms',
      'Data-driven approach with strong analytical skills',
      'Knowledge of the Ghana/West African digital landscape',
    ],
    benefits: [
      'Performance-based bonuses',
      'Marketing tool subscriptions (SEMrush, HubSpot, etc.)',
      'Professional certification sponsorship',
      'Flexible work arrangements',
    ],
    postedDate: '2025-01-03',
    featured: false,
    image: '/images/careers/marketing.png',
  },
  {
    id: '5',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Contract',
    salaryRange: 'GHS 10,000 – GHS 16,000/mo',
    description: 'We need a skilled DevOps Engineer to design and maintain our cloud infrastructure, CI/CD pipelines, and deployment automation. This is a 6-month contract role with the possibility of extension.',
    requirements: [
      '4+ years of DevOps or infrastructure engineering experience',
      'Strong expertise with AWS or GCP',
      'Experience with Docker, Kubernetes, and container orchestration',
      'Knowledge of Infrastructure as Code (Terraform, CloudFormation)',
      'Experience with CI/CD tools (GitHub Actions, GitLab CI, Jenkins)',
      'Monitoring and logging tools (Prometheus, Grafana, ELK)',
      'Security best practices and compliance knowledge',
    ],
    benefits: [
      'Competitive contract rate',
      'Remote-first with flexible hours',
      'Equipment allowance',
      'Potential for full-time conversion',
    ],
    postedDate: '2024-12-28',
    featured: false,
    image: '/images/careers/devops.png',
  },
  {
    id: '6',
    title: 'IT Training Instructor',
    department: 'Training',
    location: 'Accra, Ghana',
    type: 'Part-time',
    salaryRange: 'GHS 2,000 – GHS 4,000/mo',
    description: 'Passionate about teaching? Join our training team to deliver high-quality IT skills training programs. You will teach web development, mobile app development, and other technology courses to professionals and beginners.',
    requirements: [
      '2+ years of professional experience in IT/tech',
      'Strong communication and presentation skills',
      'Experience teaching or mentoring in technology',
      'Proficiency in web development (HTML, CSS, JavaScript, React)',
      'Knowledge of Python and/or mobile development is a plus',
      'Patience and enthusiasm for helping beginners learn',
      'Available to teach weekends and weekday evenings',
    ],
    benefits: [
      'Flexible part-time schedule',
      'Access to training materials and resources',
      'Performance-based bonuses',
      'Free access to all company training programs',
      'Networking opportunities with industry professionals',
    ],
    postedDate: '2024-12-20',
    featured: false,
    image: '/images/careers/designer.png',
  },
];

const departments = ['All Departments', 'Engineering', 'Design', 'Marketing', 'Training'];
const jobTypes = ['All Types', 'Full-time', 'Part-time', 'Contract'];

const deptColors: Record<string, string> = {
  Engineering: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  Design: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  Marketing: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Training: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
};

const typeColors: Record<string, string> = {
  'Full-time': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  'Part-time': 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  'Contract': 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function CareersPage() {
  useSEO({
    title: 'Careers',
    description: 'Join Lightworld Technologies — explore open positions in web development, mobile apps, UI/UX design, digital marketing, and more. Build your career with a leading IT company in Ghana.',
    keywords: ['IT jobs Ghana', 'tech careers Accra', 'software developer jobs', 'web development jobs Ghana', 'Lightworld Technologies careers'],
  });

  const [jobs] = useState<JobListing[]>(defaultJobs);
  const [activeDepartment, setActiveDepartment] = useState('All Departments');
  const [activeType, setActiveType] = useState('All Types');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const [visibleCount, setVisibleCount] = useState(4);

  const filtered = jobs.filter((job) => {
    const matchDept = activeDepartment === 'All Departments' || job.department === activeDepartment;
    const matchType = activeType === 'All Types' || job.type === activeType;
    return matchDept && matchType;
  });

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleApplyClick = (job: JobListing) => {
    setSelectedJob(job);
    setApplyModalOpen(true);
  };

  // Reset visible count when filters change
  useEffect(() => {
    requestAnimationFrame(() => {
      setVisibleCount(4);
    });
  }, [activeDepartment, activeType]);

  return (
    <div className="bg-background">
      {/* Full viewport book page */}
      <div className="h-[calc(100vh-5rem)] overflow-y-auto flex flex-col relative">
        {/* Subtle gradient orbs */}
        <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-600/[0.04] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[5%] w-[350px] h-[350px] rounded-full bg-amber-600/[0.03] blur-[100px] pointer-events-none" />

        {/* Compact Title Bar */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <motion.div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white">
                <Briefcase className="size-3" />
                Careers
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-slate-900 tracking-tight">
                Open Positions
              </h1>
            </div>
            <p className="text-sm dark:text-white/60 text-slate-600">
              Join Our Team — <span className="text-emerald-400">{filtered.length} position{filtered.length !== 1 ? 's' : ''} available</span>
            </p>
          </motion.div>

          {/* Compact filter pills */}
          <motion.div
            className="flex flex-wrap items-center gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <span className="text-xs uppercase tracking-wider dark:text-white/40 text-slate-500 mr-1">Dept:</span>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDepartment(dept)}
                className={`text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${
                  activeDepartment === dept
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'dark:bg-white/[0.03] bg-slate-100 dark:text-white/40 text-slate-500 dark:border-white/[0.06] border-slate-200 dark:hover:text-white/60 hover:text-slate-700 dark:hover:border-white/[0.12] hover:border-slate-300'
                }`}
              >
                {dept}
              </button>
            ))}
            <span className="w-px h-3 dark:bg-white/[0.08] bg-slate-200 mx-1" />
            <span className="text-xs uppercase tracking-wider dark:text-white/40 text-slate-500 mr-1">Type:</span>
            {jobTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${
                  activeType === type
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'dark:bg-white/[0.03] bg-slate-100 dark:text-white/40 text-slate-500 dark:border-white/[0.06] border-slate-200 dark:hover:text-white/60 hover:text-slate-700 dark:hover:border-white/[0.12] hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </motion.div>
        </div>

        {/* 2×2 Job Cards Grid */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8">
          {displayed.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 h-full"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {displayed.map((job) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  className="flex"
                >
                  <div className="flex flex-col dark:bg-white/[0.03] bg-white dark:border-white/[0.06] border-slate-200 rounded-xl overflow-hidden hover:border-emerald-500/20 dark:hover:bg-white/[0.04] hover:bg-slate-50 transition-all duration-300 group w-full">
                    {/* Featured Image Banner */}
                    {job.image && (
                      <div className="relative aspect-[21/9] overflow-hidden rounded-t-xl">
                        <Image
                          src={job.image}
                          alt={job.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 dark:from-slate-900/90 to-transparent" />
                      </div>
                    )}
                    <div className="flex flex-col flex-1 p-4 md:p-5">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold dark:text-white text-slate-900 group-hover:text-emerald-400 transition-colors truncate">
                          {job.title}
                        </h3>
                        {job.featured && (
                          <span className="inline-block text-[7px] font-bold uppercase tracking-wider text-amber-400 mt-0.5">★ Featured</span>
                        )}
                      </div>
                      <span className={`shrink-0 text-[8px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[job.type] || ''}`}>
                        {job.type}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2.5">
                      <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full font-medium ${deptColors[job.department] || 'dark:bg-white/[0.05] bg-slate-100 dark:text-white/40 text-slate-500 dark:border-white/[0.08] border-slate-200'}`}>
                        <Building2 className="size-2.5" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1 text-xs dark:text-white/55 text-slate-700">
                        <MapPin className="size-2.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400/70 font-medium">
                        <DollarSign className="size-2.5" />
                        <span className="truncate max-w-[120px]">{job.salaryRange}</span>
                      </span>
                    </div>

                    {/* Requirements bullets */}
                    <ul className="space-y-1 mb-3 flex-1">
                      {job.requirements.slice(0, 4).map((req, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs dark:text-white/65 text-slate-700 leading-tight">
                          <CheckCircle2 className="size-2.5 text-emerald-500/70 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{req}</span>
                        </li>
                      ))}
                      {job.requirements.length > 4 && (
                        <li className="text-[8px] dark:text-white/40 text-slate-500 pl-4">+{job.requirements.length - 4} more requirements</li>
                      )}
                    </ul>

                    {/* Apply button */}
                    <button
                      onClick={() => handleApplyClick(job)}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                      <Send className="size-3" />
                      Apply Now
                    </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="h-full flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <div className="size-12 rounded-full dark:bg-white/[0.04] bg-slate-100 dark:border-white/[0.06] border-slate-200 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="size-5 dark:text-white/40 text-slate-500" />
                </div>
                <p className="text-sm dark:text-white/60 text-slate-600 mb-3">No positions match your filters</p>
                <button
                  onClick={() => { setActiveDepartment('All Departments'); setActiveType('All Types'); }}
                  className="text-xs px-3 py-1 rounded-full dark:bg-white/[0.05] bg-slate-100 dark:text-white/50 text-slate-500 dark:hover:text-white/70 hover:text-slate-700 dark:border-white/[0.08] border-slate-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 border-t dark:border-white/[0.04] border-slate-200">
          <div className="flex items-center justify-between">
            <a
              href="mailto:careers@lightworldtechnologies.com?subject=General%20Application"
              className="group inline-flex items-center gap-2 text-xs dark:text-white/50 text-slate-500 hover:text-emerald-400 transition-colors"
            >
              <Mail className="size-3.5" />
              <span>Don&apos;t see a role? Send your CV to <span className="underline underline-offset-2 group-hover:text-emerald-400/80 transition-colors">careers@lightworldtechnologies.com</span></span>
            </a>
            {hasMore ? (
              <div className="flex items-center gap-3">
                <span className="text-xs dark:text-white/40 text-slate-500">
                  Showing {displayed.length} of {filtered.length} positions
                </span>
                <button
                  onClick={() => setVisibleCount(prev => prev + 4)}
                  className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
                >
                  Load More
                </button>
              </div>
            ) : filtered.length > 0 ? (
              <span className="text-xs dark:text-white/40 text-slate-500">
                {filtered.length} position{filtered.length !== 1 ? 's' : ''} available
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] bg-background dark:border-white/[0.08] border-slate-200"
          aria-describedby={undefined}
        >
          <div className="relative h-24 bg-gradient-to-br from-emerald-600 via-emerald-600 to-amber-600 flex items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.03)_75%)] bg-[length:16px_16px]" />
            <div className="text-center relative z-10">
              <div className="size-10 rounded-xl dark:bg-white/20 bg-black/5 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                <FileText className="size-5 text-white" />
              </div>
              <h2 className="text-base font-bold text-white">Apply for Position</h2>
            </div>
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-3 right-3 size-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-lg dark:text-white text-slate-900">{selectedJob?.title}</DialogTitle>
              <DialogDescription className="text-sm dark:text-white/50 text-slate-500">
                {selectedJob?.department} · {selectedJob?.location} · {selectedJob?.type}
              </DialogDescription>
            </DialogHeader>

            <ApplicationForm
              jobTitle={selectedJob?.title || ''}
              onSuccess={() => setApplyModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* CTA */}
      <CTASection />
    </div>
  );
}

function ApplicationForm({ jobTitle, onSuccess }: { jobTitle: string; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: jobTitle,
    coverLetter: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.position) return;

    setSubmitting(true);
    try {
      // Upload resume if present
      let resumeUrl = '';
      if (resumeFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', resumeFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadForm,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          resumeUrl = uploadData.url;
        }
      }

      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          resumeUrl,
        }),
      });

      if (res.ok) {
        toast.success('Application submitted!', {
          description: `We've received your application for ${jobTitle}.`,
        });
        setSubmitted(true);
        setTimeout(onSuccess, 1500);
      } else {
        toast.error('Submission failed', {
          description: 'Please try again or contact us directly.',
        });
      }
    } catch {
      toast.error('Network error', {
        description: 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="size-8 text-emerald-400" />
        </motion.div>
        <h3 className="text-lg font-semibold dark:text-white text-slate-900 mb-1">Application Received!</h3>
        <p className="text-sm dark:text-white/40 text-slate-500">
          Thank you for your interest. Our team will review your application and get back to you soon.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-name" className="text-xs font-medium dark:text-white/60 text-slate-500">Full Name *</Label>
          <Input
            id="app-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
            disabled={submitting}
            className="h-9 dark:bg-white/[0.04] bg-slate-50 dark:border-white/[0.08] border-slate-200 dark:text-white text-slate-900 text-sm dark:placeholder:text-white/25 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-email" className="text-xs font-medium dark:text-white/60 text-slate-500">Email *</Label>
          <Input
            id="app-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            disabled={submitting}
            className="h-9 dark:bg-white/[0.04] bg-slate-50 dark:border-white/[0.08] border-slate-200 dark:text-white text-slate-900 text-sm dark:placeholder:text-white/25 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-phone" className="text-xs font-medium dark:text-white/60 text-slate-500">Phone</Label>
          <Input
            id="app-phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+233 XX XXX XXXX"
            disabled={submitting}
            className="h-9 dark:bg-white/[0.04] bg-slate-50 dark:border-white/[0.08] border-slate-200 dark:text-white text-slate-900 text-sm dark:placeholder:text-white/25 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-position" className="text-xs font-medium dark:text-white/60 text-slate-500">Position *</Label>
          <Input
            id="app-position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            disabled={submitting}
            className="h-9 dark:bg-white/[0.04] bg-slate-50 dark:border-white/[0.08] border-slate-200 dark:text-white text-slate-900 text-sm dark:placeholder:text-white/25 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="app-cover" className="text-xs font-medium dark:text-white/60 text-slate-500">Cover Letter</Label>
        <Textarea
          id="app-cover"
          name="coverLetter"
          value={formData.coverLetter}
          onChange={handleChange}
          placeholder="Tell us why you're a great fit for this role..."
          rows={3}
          disabled={submitting}
          className="dark:bg-white/[0.04] bg-slate-50 dark:border-white/[0.08] border-slate-200 dark:text-white text-slate-900 text-sm dark:placeholder:text-white/25 placeholder:text-slate-400 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40 resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="app-resume" className="text-xs font-medium dark:text-white/60 text-slate-500">Resume / CV</Label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="app-resume"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed dark:border-white/[0.08] border-slate-200 hover:border-emerald-500/30 cursor-pointer transition-colors text-xs dark:text-white/35 text-slate-600 hover:text-emerald-400"
          >
            <Upload className="size-3.5" />
            {resumeFile ? resumeFile.name : 'Upload Resume (PDF, DOC)'}
            <input
              id="app-resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={submitting}
              className="sr-only"
            />
          </label>
          {resumeFile && (
            <button
              type="button"
              onClick={() => setResumeFile(null)}
              className="text-xs dark:text-white/30 text-slate-400 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting || !formData.name || !formData.email}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Submit Application
            <Send className="size-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
