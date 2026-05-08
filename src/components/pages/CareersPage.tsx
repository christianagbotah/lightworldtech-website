'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, MapPin, Clock, DollarSign, Briefcase,
  ChevronDown, ChevronUp, Send, Loader2, CheckCircle2,
  X, Building2, Users, Sparkles, Upload, FileText, GraduationCap,
  Rocket, Globe, TrendingUp, HeartHandshake,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useAppStore } from '@/lib/store';
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
  },
];

const departments = ['All Departments', 'Engineering', 'Design', 'Marketing', 'Training'];
const jobTypes = ['All Types', 'Full-time', 'Part-time', 'Contract'];

const typeColors: Record<string, string> = {
  'Full-time': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Part-time': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Contract': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function CareersPage() {
  useSEO({
    title: 'Careers',
    description: 'Join Lightworld Technologies — explore open positions in web development, mobile apps, UI/UX design, digital marketing, and more. Build your career with a leading IT company in Ghana.',
    keywords: ['IT jobs Ghana', 'tech careers Accra', 'software developer jobs', 'web development jobs Ghana', 'Lightworld Technologies careers'],
  });

  const { navigate } = useAppStore();
  const [jobs] = useState<JobListing[]>(defaultJobs);
  const [activeDepartment, setActiveDepartment] = useState('All Departments');
  const [activeType, setActiveType] = useState('All Types');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const filtered = jobs.filter((job) => {
    const matchDept = activeDepartment === 'All Departments' || job.department === activeDepartment;
    const matchType = activeType === 'All Types' || job.type === activeType;
    return matchDept && matchType;
  });

  const handleApplyClick = (job: JobListing) => {
    setSelectedJob(job);
    setApplyModalOpen(true);
  };

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 mesh-pattern opacity-20" />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-morph-blob"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl animate-morph-blob"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-amber-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-amber-400">Careers</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Join Our <span className="text-amber-400">Team</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Build your career with Lightworld Technologies. We&apos;re looking for passionate individuals who want to make a difference through technology.
          </motion.p>

          {/* Quick stats */}
          <motion.div
            className="flex flex-wrap gap-6 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {[
              { icon: Briefcase, label: 'Open Positions', value: jobs.length.toString() },
              { icon: Users, label: 'Team Members', value: '50+' },
              { icon: Building2, label: 'Office Locations', value: 'Accra' },
              { icon: GraduationCap, label: 'Training Budget', value: 'GHS 3K/yr' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 group">
                <div className="size-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <stat.icon className="size-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 dot-pattern opacity-30 dark:opacity-15" />
        <div className="container-main relative z-10">
          {/* Filters */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 mb-10"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-wrap gap-2 flex-1">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeDepartment === dept
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/25'
                      : 'bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeType === type
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/25'
                      : 'bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results info */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium text-slate-700 dark:text-slate-200">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'position' : 'positions'}
            </p>
          </div>

          {/* Job Cards */}
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {filtered.map((job) => {
              const isExpanded = expandedId === job.id;
              return (
                <motion.div key={job.id} variants={itemVariants}>
                  <Card className="border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:shadow-lg dark:hover:shadow-amber-900/20 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 overflow-hidden shimmer-sweep">
                    <CardContent className="p-0">
                      {/* Job header - clickable */}
                      <button
                        className="w-full p-5 sm:p-6 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-bold gap-1 shadow-sm">
                                  <Sparkles className="size-3" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="size-3.5 text-amber-500" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3.5 text-amber-500" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3.5 text-amber-500" />
                                {job.type}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="size-3.5 text-amber-500" />
                                {job.salaryRange}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeColors[job.type] || ''}`}>
                              {job.type}
                            </span>
                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-slate-500" />
                              ) : (
                                <ChevronDown className="size-4 text-slate-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 sm:px-6 pb-6 pt-0 border-t border-slate-100 dark:border-slate-700">
                              <div className="pt-5 space-y-5">
                                {/* Description */}
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">About the Role</h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{job.description}</p>
                                </div>

                                {/* Requirements */}
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Requirements</h4>
                                  <ul className="space-y-1.5">
                                    {job.requirements.map((req) => (
                                      <li key={req} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle2 className="size-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <span>{req}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Benefits */}
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Benefits & Perks</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {job.benefits.map((benefit) => (
                                      <div key={benefit} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <span className="text-amber-500 shrink-0 mt-0.5">✓</span>
                                        <span>{benefit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Apply Button */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                                  <Button
                                    onClick={() => handleApplyClick(job)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all"
                                  >
                                    <Send className="size-4 mr-2" />
                                    Apply Now
                                  </Button>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 self-center">
                                    Posted {new Date(job.postedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* No results */}
          {filtered.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="size-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No positions found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                No open positions match your current filters. Try different criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => { setActiveDepartment('All Departments'); setActiveType('All Types'); }}
                className="border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
              >
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Why Work With Us */}
          <motion.div
            className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-900/20 dark:via-slate-800/50 dark:to-amber-900/20 border border-amber-200/80 dark:border-amber-800/60 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 diagonal-stripes opacity-30" />

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center relative">
              Why Work at <span className="text-gradient-amber">Lightworld Technologies</span>?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {[
                { icon: Rocket, title: 'Innovation', desc: 'Work with cutting-edge technologies and solve real challenges', gradient: 'from-amber-400 to-yellow-500' },
                { icon: Globe, title: 'Impact', desc: 'Build solutions that transform businesses across Africa', gradient: 'from-amber-500 to-amber-600' },
                { icon: TrendingUp, title: 'Growth', desc: 'Continuous learning with dedicated budgets and mentorship', gradient: 'from-amber-400 to-amber-500' },
                { icon: HeartHandshake, title: 'Culture', desc: 'Collaborative, inclusive environment that values your voice', gradient: 'from-yellow-400 to-amber-500' },
              ].map((item) => (
                <div key={item.title} className="text-center p-5 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-slate-100 dark:border-white/5 hover:border-amber-200 dark:hover:border-amber-700/50 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300 group">
                  <div className={`inline-flex size-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <item.icon className="size-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Application Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
          <div className="relative h-28 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 flex items-center justify-center">
            <div className="absolute inset-0 grid-pattern opacity-15" />
            <div className="text-center relative z-10">
              <div className="size-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                <FileText className="size-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Apply for Position</h2>
            </div>
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedJob?.title}</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
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
    </main>
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
          className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="size-8 text-amber-600 dark:text-amber-400" />
        </motion.div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Application Received!</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Thank you for your interest. Our team will review your application and get back to you soon.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-name" className="text-sm font-medium">Full Name *</Label>
          <Input
            id="app-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            required
            disabled={submitting}
            className="h-10 focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-email" className="text-sm font-medium">Email *</Label>
          <Input
            id="app-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            disabled={submitting}
            className="h-10 focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="app-phone" className="text-sm font-medium">Phone</Label>
          <Input
            id="app-phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+233 XX XXX XXXX"
            disabled={submitting}
            className="h-10 focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-position" className="text-sm font-medium">Position *</Label>
          <Input
            id="app-position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            disabled={submitting}
            className="h-10 focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="app-cover" className="text-sm font-medium">Cover Letter</Label>
        <Textarea
          id="app-cover"
          name="coverLetter"
          value={formData.coverLetter}
          onChange={handleChange}
          placeholder="Tell us why you're a great fit for this role..."
          rows={4}
          disabled={submitting}
          className="focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600 resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="app-resume" className="text-sm font-medium">Resume / CV</Label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="app-resume"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer transition-colors text-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
          >
            <Upload className="size-4" />
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
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting || !formData.name || !formData.email}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all"
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
