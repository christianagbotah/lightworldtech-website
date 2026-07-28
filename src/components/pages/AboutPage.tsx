'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Eye, Heart, Users, Lightbulb, Shield, Award, Rocket, UserCheck,
  Calendar, UsersRound, Twitter, Linkedin, Mail, Github, User, Camera,
  ChevronRight, MapPin, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useSEO } from '@/hooks/use-seo';
import Image from 'next/image';

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

/* ═══════════════════════════════ DATA ═══════════════════════════════ */

const values = [
  { icon: Lightbulb, title: 'Innovation', description: 'We embrace new technologies and creative approaches to solve complex challenges.', accent: 'from-emerald-500 to-emerald-600' },
  { icon: Heart, title: 'Passion', description: 'We are driven by a genuine passion for technology and the positive impact it creates.', accent: 'from-amber-500 to-amber-600' },
  { icon: Shield, title: 'Integrity', description: 'We conduct business with transparency, honesty, and a strong ethical foundation.', accent: 'from-yellow-500 to-yellow-600' },
  { icon: Users, title: 'Collaboration', description: 'We believe in the power of teamwork and building strong partnerships with our clients.', accent: 'from-emerald-400 to-teal-500' },
  { icon: Award, title: 'Excellence', description: 'We strive for the highest quality in everything we do, from code to customer service.', accent: 'from-amber-400 to-orange-500' },
  { icon: Target, title: 'Results-Driven', description: 'We focus on delivering measurable outcomes that create real business value.', accent: 'from-yellow-400 to-amber-500' },
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
  { value: 200, suffix: '+', label: 'Happy Clients', icon: UserCheck },
  { value: 150, suffix: '+', label: 'Projects Delivered', icon: Rocket },
  { value: 8, suffix: '+', label: 'Years Experience', icon: Calendar },
  { value: 50, suffix: '+', label: 'Team Members', icon: UsersRound },
];

const socialLinks = [
  { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-[#0077B5]', field: 'linkedin' as const },
  { icon: Twitter, label: 'Twitter', color: 'hover:bg-[#1DA1F2]', field: 'twitter' as const },
  { icon: Github, label: 'GitHub', color: 'hover:bg-[#333]', field: 'github' as const },
  { icon: Mail, label: 'Email', color: 'hover:bg-emerald-700', field: 'email' as const },
];

/* ═══════════════════════ ANIMATION VARIANTS ═══════════════════════ */

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/* ═══════════════════════════════ COMPONENTS ═══════════════════════ */

function PhotoSlot({ member, sizeClass = 'size-24 lg:size-28' }: { member: TeamMember; sizeClass?: string }) {
  return (
    <div className={`relative ${sizeClass} shrink-0 rounded-2xl overflow-hidden dark:bg-slate-800/60 bg-slate-100 border border-slate-200 dark:border-white/[0.06]`}>
      {member.image ? (
        <Image src={member.image} alt={member.name} fill className="object-cover object-top" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-200/80 to-slate-300/80 dark:from-slate-800/60 dark:to-slate-900/60 flex flex-col items-center justify-center gap-1.5">
          <User className="size-8 lg:size-10 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
          <div className="flex items-center gap-1">
            <Camera className="size-2.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Photo</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ value, suffix, label, icon: Icon, delay = 0 }: { value: number; suffix: string; label: string; icon: React.ElementType; delay?: number }) {
  const { count, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <motion.div ref={ref} variants={fadeUp} className="flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:bg-white/[0.05] hover:bg-slate-50 transition-all duration-300 group">
      <div className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-500/80 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
        <Icon className="size-4.5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-amber-400 tabular-nums leading-tight">{count}{suffix}</div>
        <div className="text-xs dark:text-white/50 text-slate-500 leading-tight">{label}</div>
      </div>
    </motion.div>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div variants={fadeUp}>
      <Card className="dark:bg-white/[0.03] bg-white border border-slate-100 dark:border-white/[0.06] shadow-sm backdrop-blur-sm hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/20 transition-all duration-300 group rounded-xl overflow-hidden">
        <CardContent className="p-4 lg:p-5">
          <div className="flex gap-4">
            {/* Left: Member info */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-base lg:text-lg dark:text-white text-slate-900 group-hover:text-amber-400 transition-colors truncate">{member.name}</h3>
                <ChevronRight className={`size-3.5 text-slate-400 dark:text-white/30 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
              </div>
              <p className="text-xs text-amber-400 font-medium truncate">{member.role}</p>
              <p className={`text-sm dark:text-white/50 text-slate-500 leading-relaxed mt-1.5 transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
                {member.bio}
              </p>

              {/* Expandable skills + socials */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-[10px] lg:text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-2.5">
                      {socialLinks.map(({ icon: SocialIcon, label, color, field }) => {
                        const href = field === 'email' && member.email ? `mailto:${member.email}` : (member[field] || '#');
                        return (
                          <a
                            key={label}
                            href={href}
                            aria-label={`${label} - ${member.name}`}
                            title={`${label} - ${member.name}`}
                            className={`size-7 rounded-full dark:bg-white/[0.06] bg-slate-100 dark:text-white/50 text-slate-500 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:text-white ${color}`}
                          >
                            <SocialIcon className="size-3.5" />
                          </a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-amber-400/80 font-medium mt-1.5 hover:text-amber-400 transition-colors text-left"
              >
                {expanded ? 'Show less' : 'View profile'}
              </button>
            </div>
            {/* Right: Portrait photo slot */}
            <PhotoSlot member={member} sizeClass="size-20 lg:size-24 xl:size-28" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ValueCard({ value, index }: { value: typeof values[0]; index: number }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full dark:bg-white/[0.03] bg-white border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-emerald-500/20 dark:hover:bg-white/[0.05] hover:bg-slate-50 transition-all duration-300 group rounded-xl overflow-hidden relative">
        <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${value.accent}`} style={{ opacity: 0 }} />
        <CardContent className="p-4 lg:p-5 relative flex flex-col h-full">
          <div className={`size-10 rounded-lg bg-gradient-to-br ${value.accent} flex items-center justify-center mb-2.5 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
            <value.icon className="size-4 lg:size-5 text-white" />
          </div>
          <h3 className="font-semibold text-sm lg:text-base dark:text-white text-slate-900 group-hover:text-amber-400 transition-colors leading-tight">{value.title}</h3>
          <p className="text-xs lg:text-sm dark:text-white/45 text-slate-500 leading-relaxed mt-1 line-clamp-2">{value.description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═════════════════════════════ MAIN PAGE ═════════════════════════ */

export default function AboutPage() {
  useSEO({
    title: 'About Us',
    description: 'Learn about Lightworld Technologies — a passionate team of innovators dedicated to transforming businesses through technology in Ghana and across Africa.',
    keywords: ['about Lightworld Technologies', 'IT company Ghana', 'tech team Accra', 'web development company', 'digital transformation Africa'],
  });

  const [team, setTeam] = useState<TeamMember[]>(defaultTeam);
  const [loading, setLoading] = useState(true);

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
    <main className="h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">

        {/* ═══ Page Header ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 font-semibold">
              <Sparkles className="size-3 mr-1" />
              Est. 2016
            </Badge>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-slate-900">About <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">Lightworld</span></h1>
              <p className="text-sm dark:text-white/50 text-slate-500 mt-0.5">Driving digital transformation across Africa and beyond.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs dark:text-white/40 text-slate-500">
            <MapPin className="size-3.5 text-emerald-500" />
            <span>Accra, Ghana</span>
            <span className="mx-1 text-slate-300 dark:text-white/15">·</span>
            <span className="flex items-center gap-1"><Award className="size-3.5 text-amber-500" /> Award-Winning Team</span>
          </div>
        </motion.div>

        {/* ═══ Stats Strip ═══ */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat, index) => (
            <StatPill key={stat.label} value={stat.value} suffix={stat.suffix} label={stat.label} icon={stat.icon} delay={index * 200} />
          ))}
        </motion.div>

        {/* ═══ Two-Column: Values + Team ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Left Column — Core Values */}
          <motion.div variants={stagger} initial="hidden" animate="visible" className="lg:col-span-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-amber-400" />
              <h2 className="text-lg font-semibold dark:text-white text-slate-900">Our Core Values</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {values.map((value, idx) => (
                <ValueCard key={value.title} value={value} index={idx} />
              ))}
            </div>
          </motion.div>

          {/* Right Column — Team Members */}
          <motion.div variants={stagger} initial="hidden" animate="visible" className="lg:col-span-7">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-emerald-400" />
              <h2 className="text-lg font-semibold dark:text-white text-slate-900">Meet the Team</h2>
              <span className="text-xs dark:text-white/30 text-slate-400 ml-auto">Click to expand</span>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] rounded-xl">
                    <div className="p-4 flex gap-4 items-center">
                      <Skeleton className="size-20 rounded-2xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                team.map((member) => (
                  <TeamCard key={member.id} member={member} />
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══ Awards Section ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-400" />
            <h2 className="text-lg font-semibold dark:text-white text-slate-900">Recognition & Awards</h2>
          </div>
          <div className="rounded-xl dark:bg-white/[0.03] bg-white border border-slate-100 dark:border-white/[0.06] shadow-sm p-4 lg:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {awards.map((award, index) => (
                <motion.div
                  key={award.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-lg dark:bg-white/[0.03] bg-slate-50 dark:hover:bg-white/[0.06] hover:bg-slate-100 border border-slate-100 dark:border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 group cursor-default"
                >
                  <div className="size-9 shrink-0 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
                    <Award className="size-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold dark:text-white/90 text-slate-800 leading-snug">{award.title}</p>
                    <p className="text-xs dark:text-white/40 text-slate-500 mt-0.5 leading-relaxed">{award.organization}</p>
                    <Badge className="mt-1.5 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 px-1.5 py-0 font-semibold">{award.year}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom breathing room */}
        <div className="h-2" />
      </div>
    </main>
  );
}
