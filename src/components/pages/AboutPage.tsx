'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Lightbulb, Shield, Award, ChevronRight, ChevronLeft, Rocket, UserCheck, Calendar, UsersRound, Twitter, Linkedin, Globe, Mail, Github, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useSEO } from '@/hooks/use-seo';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  skills?: string[];
  linkedin?: string;
  twitter?: string;
  github?: string;
  email?: string;
  image?: string;
}

const values = [
  { icon: Lightbulb, title: 'Innovation', description: 'We embrace new technologies and creative approaches to solve complex challenges.' },
  { icon: Heart, title: 'Passion', description: 'We are driven by a genuine passion for technology and the positive impact it creates.' },
  { icon: Shield, title: 'Integrity', description: 'We conduct business with transparency, honesty, and a strong ethical foundation.' },
  { icon: Users, title: 'Collaboration', description: 'We believe in the power of teamwork and building strong partnerships with our clients.' },
  { icon: Award, title: 'Excellence', description: 'We strive for the highest quality in everything we do, from code to customer service.' },
  { icon: Target, title: 'Results-Driven', description: 'We focus on delivering measurable outcomes that create real business value.' },
];

const defaultTeam: TeamMember[] = [
  { id: '1', name: 'Emmanuel Osei', role: 'Founder & CEO', bio: 'Visionary leader with 10+ years in IT solutions and digital transformation across Africa. Passionate about leveraging technology to solve real-world challenges and empowering businesses to thrive in the digital age.', skills: ['Strategic Planning', 'Business Development', 'Project Management', 'Digital Transformation'], linkedin: 'https://linkedin.com/in/emmanuel-osei', twitter: 'https://twitter.com/emmanuel_osei', github: 'https://github.com/emmanuel-osei', email: 'emmanuel@lightworldtech.com' },
  { id: '2', name: 'Kwame Asante', role: 'Lead Developer', bio: 'Full-stack developer with expertise in modern web and mobile technologies. Committed to writing clean, scalable code and mentoring the next generation of developers in Ghana.', skills: ['React', 'Node.js', 'TypeScript', 'System Architecture', 'DevOps'], linkedin: 'https://linkedin.com/in/kwame-asante', twitter: 'https://twitter.com/kwame_asante', github: 'https://github.com/kwame-asante', email: 'kwame@lightworldtech.com' },
  { id: '3', name: 'Abena Mensah', role: 'UI/UX Designer', bio: 'Award-winning designer passionate about creating intuitive user experiences. Specializes in design systems, accessibility, and user research to create interfaces that users love.', skills: ['UI Design', 'UX Research', 'Figma', 'Design Systems', 'Accessibility'], linkedin: 'https://linkedin.com/in/abena-mensah', twitter: 'https://twitter.com/abena_mensah', github: 'https://github.com/abena-mensah', email: 'abena@lightworldtech.com' },
  { id: '4', name: 'Kofi Amponsah', role: 'Digital Marketing Lead', bio: 'Digital marketing expert specializing in SEO, social media, and growth strategies. Has helped dozens of businesses increase their online visibility and revenue through data-driven marketing.', skills: ['SEO', 'Content Marketing', 'Google Ads', 'Analytics', 'Social Media'], linkedin: 'https://linkedin.com/in/kofi-amponsah', twitter: 'https://twitter.com/kofi_amponsah', github: 'https://github.com/kofi-amponsah', email: 'kofi@lightworldtech.com' },
];

const awards = [
  { title: '2024 Business Excellence Award', organization: 'Ghana Business Excellence Awards', year: '2024' },
  { title: '2021 MEA Awards Winner', organization: 'Middle East & Africa IT Awards', year: '2021' },
  { title: 'Top 10 IT Companies in Ghana', organization: 'TechReview Africa', year: '2023' },
  { title: 'Best Web Development Agency', organization: 'Africa Digital Excellence Awards', year: '2022' },
];

const stats = [
  { value: 100, suffix: '+', label: 'Projects Delivered', icon: Rocket },
  { value: 100, suffix: '+', label: 'Happy Clients', icon: UserCheck },
  { value: 8, suffix: '+', label: 'Years Experience', icon: Calendar },
  { value: 50, suffix: '+', label: 'Team Members', icon: UsersRound },
];

function AnimatedStatCard({ value, suffix, label, icon: Icon, delay = 0, maxValue = 100 }: { value: number; suffix: string; label: string; icon: React.ElementType; delay?: number; maxValue?: number }) {
  const { count, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  const progress = Math.min(count / maxValue, 1);
  const size = 80;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <Card ref={ref} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-200 dark:hover:border-amber-700 hover:shadow-lg dark:hover:shadow-amber-900/20 transition-all duration-300 group">
      <CardContent className="p-6 text-center">
        <div className="relative mx-auto mb-3" style={{ width: size, height: size }}>
          <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
            <defs>
              <linearGradient id={`ring-gradient-${label.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-slate-700" />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#ring-gradient-${label.replace(/\s+/g, '-')})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-100 ease-out" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/50 flex items-center justify-center group-hover:shadow-md transition-shadow duration-300">
              <Icon className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{count}{suffix}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const socialLinks = [
  { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-[#0077B5]', field: 'linkedin' as const },
  { icon: Twitter, label: 'Twitter', color: 'hover:bg-[#1DA1F2]', field: 'twitter' as const },
  { icon: Github, label: 'GitHub', color: 'hover:bg-[#333]', field: 'github' as const },
  { icon: Mail, label: 'Email', color: 'hover:bg-amber-500', field: 'email' as const },
];

function TeamFlipCard({ member }: { member: TeamMember }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-[320px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
      tabIndex={0}
      role="button"
      aria-label={`${member.name} - click to ${isFlipped ? 'hide' : 'show'} details`}
    >
      <motion.div
        className="w-full h-full relative"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front face */}
        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl transition-shadow" style={{ backfaceVisibility: 'hidden' }}>
          <div className="h-44 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30 relative overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-20 rounded-full bg-amber-300/50 dark:bg-amber-700/40 flex items-center justify-center text-2xl font-bold text-amber-700 dark:text-amber-300">
                {member.name.charAt(0)}
              </div>
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{member.name}</h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{member.role}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2">{member.bio}</p>
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-400 dark:text-slate-500">
              <ExternalLink className="size-3" />
              <span>Tap to see more</span>
            </div>
          </div>
        </div>

        {/* Back face */}
        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-amber-200 dark:border-amber-700 bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-900 shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="relative z-10 p-5 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-white truncate">{member.name}</h3>
                <p className="text-xs text-amber-200">{member.role}</p>
              </div>
            </div>

            <p className="text-xs text-amber-100/80 leading-relaxed mb-3 flex-1">{member.bio}</p>

            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-amber-200/60 font-medium mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {member.skills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 rounded-full bg-white/10 text-amber-100 text-[10px] font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            <div className="flex gap-2 mt-auto">
              {socialLinks.map(({ icon: SocialIcon, label, color, field }) => {
                const href = field === 'email' && member.email ? `mailto:${member.email}` : (member[field] || '#');
                return (
                  <a
                    key={label}
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className={`size-8 rounded-full bg-white/15 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 ${color}`}
                    aria-label={`${label} - ${member.name}`}
                    title={`${label} - ${member.name}`}
                  >
                    <SocialIcon className="size-3.5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TeamExpandCard({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl dark:hover:shadow-amber-900/20 hover:-translate-y-1 transition-all duration-300 group">
      <div className="h-48 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-20 rounded-full bg-amber-300/50 dark:bg-amber-700/40 flex items-center justify-center text-2xl font-bold text-amber-700 dark:text-amber-300 transition-transform duration-300 group-hover:scale-110">
            {member.name.charAt(0)}
          </div>
        </div>
        {/* Hover social overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-amber-900/90 via-amber-900/70 to-amber-800/40 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <p className="text-[11px] text-amber-200 font-medium mb-2 tracking-wide uppercase">Connect</p>
          <div className="flex gap-2">
            {socialLinks.map(({ icon: SocialIcon, label, color, field }) => {
              const href = field === 'email' && member.email ? `mailto:${member.email}` : (member[field] || '#');
              return (
                <a
                  key={label}
                  href={href}
                  aria-label={`${label} - ${member.name}`}
                  title={`${label} - ${member.name}`}
                  className={`size-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 ${color}`}
                >
                  <SocialIcon className="size-3.5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{member.name}</h3>
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{member.role}</p>

        {/* Expandable bio */}
        <div className="mt-3">
          <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
            {member.bio}
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>

        {/* Skills (visible when expanded) */}
        {expanded && member.skills && member.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700"
          >
            <div className="flex flex-wrap gap-1">
              {member.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                  {skill}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AboutPage() {
  const { navigate } = useAppStore();
  useSEO({
    title: 'About Us',
    description: 'Learn about Lightworld Technologies - a passionate team of innovators dedicated to transforming businesses through technology in Ghana and across Africa.',
    keywords: ['about Lightworld Technologies', 'IT company Ghana', 'tech team Accra', 'web development company', 'digital transformation Africa'],
  });
  const [team, setTeam] = useState<TeamMember[]>(defaultTeam);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = 296;
    const slide = Math.round(scrollLeft / cardWidth);
    setCurrentSlide(slide);
  }, []);

  const scrollCarousel = useCallback((direction: number) => {
    if (!scrollRef.current) return;
    const cardWidth = 296;
    const newScroll = scrollRef.current.scrollLeft + direction * cardWidth;
    scrollRef.current.scrollTo({ left: newScroll, behavior: 'smooth' });
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = 296;
    scrollRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetcher('/api/team')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((t: Record<string, unknown>) => {
            const defaults = defaultTeam.find(d => d.name === t.name);
            return {
              ...t,
              skills: t.skills || defaults?.skills || [],
              bio: t.bio || defaults?.bio || '',
            } as TeamMember;
          });
          setTeam(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-amber-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-amber-400">About Us</span>
          </nav>
          <motion.h1 className="text-4xl sm:text-5xl font-bold text-white mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            About <span className="text-amber-400">Lightworld Technologies</span>
          </motion.h1>
          <motion.p className="text-lg text-slate-300 max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            A passionate team of innovators dedicated to transforming businesses through technology.
          </motion.p>
        </div>
      </section>

      {/* Company Story */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Our Story</span>
              <h2 className="text-3xl font-bold mt-2 mb-6 text-slate-900 dark:text-white">Building the Future of Technology in Africa</h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>Founded with a vision to bridge the technology gap in Africa, Lightworld Technologies has grown from a small startup to a leading IT solutions provider. Our journey began with a simple belief: that every business, regardless of size, deserves access to world-class technology solutions.</p>
                <p>Over the years, we have built a reputation for excellence, innovation, and client satisfaction. Our team of talented professionals brings diverse expertise and a shared passion for creating impactful digital solutions that drive real business outcomes.</p>
                <p>Today, we serve clients across multiple industries, from startups to established enterprises, helping them navigate the digital landscape and achieve sustainable growth through technology.</p>
              </div>
            </motion.div>
            <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              {stats.map((stat, index) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                  <AnimatedStatCard value={stat.value} suffix={stat.suffix} label={stat.label} icon={stat.icon} delay={index * 200} maxValue={stat.value} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Card className="h-full border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4"><Target className="size-6 text-amber-600 dark:text-amber-400" /></div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">To deliver innovative, reliable, and scalable IT solutions that empower businesses across Africa to achieve digital transformation, drive growth, and compete effectively in the global marketplace.</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
              <Card className="h-full border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4"><Eye className="size-6 text-amber-600 dark:text-amber-400" /></div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Our Vision</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">To be Africa&apos;s most trusted technology partner, recognized globally for our commitment to innovation, quality, and the positive impact we create for businesses and communities through technology.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Core Values That Drive Us</h2>
            <p className="text-slate-600 dark:text-slate-300">The principles that guide everything we do at Lightworld Technologies.</p>
          </motion.div>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {values.map((value, idx) => (
              <motion.div key={value.title} variants={itemVariants}>
                <Card className="h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-200 dark:hover:border-amber-700 hover:shadow-lg dark:hover:shadow-amber-900/20 hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
                  <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${idx % 3 === 0 ? 'bg-amber-200/40 dark:bg-amber-500/10' : idx % 3 === 1 ? 'bg-amber-200/40 dark:bg-amber-500/10' : 'bg-yellow-200/40 dark:bg-yellow-500/10'}`} />
                  <CardContent className="p-6 relative">
                    <div className={`size-12 rounded-xl flex items-center justify-center mb-4 group-hover:shadow-md transition-all duration-300 group-hover:scale-110 ${idx % 3 === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/20' : idx % 3 === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-400/20' : 'bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md shadow-yellow-500/20'}`}>
                      <value.icon className="size-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{value.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Our Team</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Meet the Experts</h2>
            <p className="text-slate-600 dark:text-slate-300">The talented people behind our success. <span className="text-amber-600 dark:text-amber-400 font-medium">Click a card</span> to learn more.</p>
          </motion.div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white dark:bg-slate-800">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop: Expand cards with hover social links */}
              <motion.div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                {team.map((member) => (
                  <motion.div key={member.id} variants={itemVariants}>
                    <TeamExpandCard member={member} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Mobile/Tablet: Flip cards */}
              <div className="lg:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {team.map((member) => (
                    <TeamFlipCard key={member.id} member={member} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Awards */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <motion.div className="text-center max-w-2xl mx-auto mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Recognition</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Awards & Achievements</h2>
          </motion.div>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {awards.map((award) => (
              <motion.div key={award.title} variants={itemVariants}>
                <Card className="h-full border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-900/20 dark:via-slate-800 dark:to-amber-900/10 text-center hover:shadow-lg dark:hover:shadow-amber-900/20 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-20 h-20 bg-amber-200/30 dark:bg-amber-700/10 rounded-full blur-2xl group-hover:bg-amber-200/50 dark:group-hover:bg-amber-700/20 transition-colors duration-500" />
                  <CardContent className="p-6 relative">
                    <div className="size-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-900/60 flex items-center justify-center mx-auto mb-3 group-hover:shadow-md transition-shadow duration-300">
                      <Award className="size-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700 mb-3 font-semibold">{award.year}</Badge>
                    <h3 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">{award.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{award.organization}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
