'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Lightbulb, Shield, Award, Rocket, UserCheck, Calendar, UsersRound, Twitter, Linkedin, Mail, Github, User, Camera } from 'lucide-react';
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
  { value: 200, suffix: '+', label: 'Happy Clients', icon: UserCheck, maxValue: 500 },
  { value: 150, suffix: '+', label: 'Projects Delivered', icon: Rocket, maxValue: 500 },
  { value: 8, suffix: '+', label: 'Years Experience', icon: Calendar, maxValue: 15 },
  { value: 50, suffix: '+', label: 'Team Members', icon: UsersRound, maxValue: 100 },
];

const socialLinks = [
  { icon: Linkedin, label: 'LinkedIn', color: 'hover:bg-[#0077B5]', field: 'linkedin' as const },
  { icon: Twitter, label: 'Twitter', color: 'hover:bg-[#1DA1F2]', field: 'twitter' as const },
  { icon: Github, label: 'GitHub', color: 'hover:bg-[#333]', field: 'github' as const },
  { icon: Mail, label: 'Email', color: 'hover:bg-emerald-700', field: 'email' as const },
];

function TeamAvatar({ member, size = 'md' }: { member: TeamMember; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'size-9',
    md: 'size-12 lg:size-14',
    lg: 'size-16 lg:size-20',
  };

  return (
    <div className={`${sizeClasses[size]} shrink-0 rounded-full overflow-hidden border-2 border-amber-400/30 dark:border-amber-400/20 flex items-center justify-center bg-gradient-to-br from-amber-900/60 to-amber-800/80 shadow-lg shadow-amber-500/15`}>
      {member.image ? (
        <Image
          src={member.image}
          alt={member.name}
          width={size === 'sm' ? 36 : size === 'md' ? 56 : 80}
          height={size === 'sm' ? 36 : size === 'md' ? 56 : 80}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : (
        <span className={`${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg lg:text-xl' : 'text-2xl lg:text-3xl'} font-bold text-amber-200`}>
          {member.name.charAt(0)}
        </span>
      )}
    </div>
  );
}

function TeamPhotoSlot({ member, sizeClass = 'size-20 lg:size-24' }: { member: TeamMember; sizeClass?: string }) {
  return (
    <div className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-xl dark:bg-slate-800/80 bg-slate-200`}>
      {member.image ? (
        <Image src={member.image} alt={member.name} fill className="object-cover object-top" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800/80 dark:to-slate-900/80 flex flex-col items-center justify-center gap-1.5">
          <div className="relative">
            <User className="size-8 lg:size-10 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-amber-400/20 flex items-center justify-center">
              <Camera className="size-2 text-amber-500" />
            </div>
          </div>
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Photo</span>
        </div>
      )}
    </div>
  );
}

function CompactStatItem({ value, suffix, label, icon: Icon, delay = 0 }: { value: number; suffix: string; label: string; icon: React.ElementType; delay?: number }) {
  const { count, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });

  return (
    <div ref={ref} className="flex items-center gap-3 p-4 lg:p-5 rounded-xl dark:bg-white/[0.03] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:bg-white/[0.05] hover:bg-slate-100 transition-all duration-300 group">
      <div className="size-12 shrink-0 rounded-lg bg-gradient-to-br from-amber-900/40 to-amber-900/60 flex items-center justify-center group-hover:shadow-md group-hover:shadow-amber-500/20 transition-all duration-300">
        <Icon className="size-5 text-amber-400" />
      </div>
      <div className="min-w-0">
        <div className="text-xl lg:text-2xl font-bold text-amber-400 tabular-nums leading-tight">{count}{suffix}</div>
        <div className="text-sm dark:text-white/55 text-slate-600 leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const fadeVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function TeamFlipCard({ member }: { member: TeamMember }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative w-full cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
      tabIndex={0}
      role="button"
      aria-label={`${member.name} - click to ${isFlipped ? 'hide' : 'show'} details`}
    >
      <motion.div
        className="w-full relative"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front face */}
        <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-white/[0.06] dark:bg-white/[0.04] bg-white shadow-sm backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300" style={{ backfaceVisibility: 'hidden' }}>
          <div className="flex gap-3 p-3">
            {/* Left: Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-semibold text-sm dark:text-white text-slate-900 truncate">{member.name}</h3>
              <p className="text-[11px] text-amber-400 font-medium truncate">{member.role}</p>
              <p className="text-xs dark:text-white/40 text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{member.bio}</p>
            </div>
            {/* Right: Portrait image slot */}
            <TeamPhotoSlot member={member} sizeClass="size-20" />
          </div>
        </div>

        {/* Back face */}
        <div className="absolute inset-0 w-full rounded-xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-amber-600 to-amber-500" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="flex gap-3 p-3 h-full">
            {/* Left: Details */}
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="font-semibold text-sm text-white truncate">{member.name}</h3>
              <p className="text-[11px] text-amber-200 mt-0.5">{member.role}</p>
              <p className="text-xs text-amber-100/80 leading-relaxed flex-1 line-clamp-3 mt-1.5">{member.bio}</p>
              {member.skills && member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {member.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="px-1.5 py-0.5 rounded-full bg-white/10 text-amber-100 text-[10px] font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 mt-2">
                {socialLinks.map(({ icon: SocialIcon, label, color, field }) => {
                  const href = field === 'email' && member.email ? `mailto:${member.email}` : (member[field] || '#');
                  return (
                    <a
                      key={label}
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className={`size-6 rounded-full bg-white/15 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 ${color}`}
                      aria-label={`${label} - ${member.name}`}
                      title={`${label} - ${member.name}`}
                    >
                      <SocialIcon className="size-3" />
                    </a>
                  );
                })}
              </div>
            </div>
            {/* Right: Portrait image slot */}
            <TeamPhotoSlot member={member} sizeClass="size-20" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TeamExpandCard({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative rounded-xl">
      <Card className="relative z-10 overflow-hidden border border-slate-100 dark:border-white/[0.06] dark:bg-white/[0.04] bg-white shadow-sm backdrop-blur-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 group">
        <CardContent className="p-4 lg:p-5">
          <div className="flex gap-3 lg:gap-4">
            {/* Left: Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base lg:text-lg dark:text-white text-slate-900 group-hover:text-amber-400 transition-colors truncate">{member.name}</h3>
              <p className="text-xs text-amber-400 font-medium truncate">{member.role}</p>
              <div className="mt-1.5">
                <p className={`text-sm dark:text-white/50 text-slate-500 leading-relaxed transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
                  {member.bio}
                </p>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-amber-400 font-medium mt-1 hover:text-amber-300 transition-colors"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              </div>
              {expanded && member.skills && member.skills.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]"
                >
                  <div className="flex flex-wrap gap-1">
                    {member.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {socialLinks.map(({ icon: SocialIcon, label, color, field }) => {
                  const href = field === 'email' && member.email ? `mailto:${member.email}` : (member[field] || '#');
                  return (
                    <a
                      key={label}
                      href={href}
                      aria-label={`${label} - ${member.name}`}
                      title={`${label} - ${member.name}`}
                      className={`size-7 rounded-full dark:bg-white/10 bg-slate-100 dark:text-white/60 text-slate-500 flex items-center justify-center transition-all duration-200 hover:scale-110 ${color}`}
                    >
                      <SocialIcon className="size-3.5" />
                    </a>
                  );
                })}
              </div>
            </div>
            {/* Right: Portrait image slot */}
            <TeamPhotoSlot member={member} sizeClass="size-20 lg:size-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AboutPage() {
  useSEO({
    title: 'About Us',
    description: 'Learn about Lightworld Technologies - a passionate team of innovators dedicated to transforming businesses through technology in Ghana and across Africa.',
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
    <main className="h-[calc(100vh-5rem)] overflow-hidden bg-background flex flex-col">
      {/* Compact Title Bar */}
      <motion.div
        className="shrink-0 px-4 sm:px-6 py-5 sm:py-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.06]"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={fadeVariant}>
          <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 font-semibold shrink-0">
            Est. 2016
          </Badge>
        </motion.div>
        <motion.div variants={fadeVariant} className="min-w-0">
          <h1 className="text-2xl font-bold dark:text-white/90 text-slate-800 truncate">About Lightworld Technologies</h1>
          <p className="text-sm dark:text-white/50 text-slate-500 truncate">A passionate team of innovators driving digital transformation across Africa and beyond.</p>
        </motion.div>
        <motion.div variants={fadeVariant} className="ml-auto hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Target className="size-4 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Mission-Driven</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Eye className="size-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">Future-Focused</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <motion.div
        className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 pb-4 md:pb-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Left Column — Stats */}
        <motion.div variants={itemVariants} className="md:col-span-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1 shrink-0 mt-1">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-amber-400" />
            <h2 className="text-base lg:text-lg font-semibold dark:text-white/90 text-slate-800 uppercase tracking-wider">By the Numbers</h2>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {stats.map((stat, index) => (
              <CompactStatItem
                key={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                icon={stat.icon}
                delay={index * 200}
              />
            ))}
          </div>
        </motion.div>

        {/* Center Column — Core Values */}
        <motion.div variants={itemVariants} className="md:col-span-5 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 mb-1 shrink-0 mt-1">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-400 to-emerald-400" />
            <h2 className="text-base lg:text-lg font-semibold dark:text-white/90 text-slate-800 uppercase tracking-wider">Core Values</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-1 min-h-0 auto-rows-fr">
            {values.map((value, idx) => (
              <motion.div key={value.title} variants={itemVariants} className="min-h-0">
                <Card className="h-full border-slate-100 dark:border-white/[0.06] dark:bg-white/[0.03] bg-white shadow-sm backdrop-blur-sm hover:border-emerald-500/30 dark:hover:bg-white/[0.05] hover:bg-slate-100 transition-all duration-300 group overflow-hidden relative rounded-xl">
                  <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${idx % 3 === 0 ? 'bg-emerald-500/10' : idx % 3 === 1 ? 'bg-amber-500/10' : 'bg-yellow-500/10'}`} />
                  <CardContent className="p-4 lg:p-5 relative flex flex-col h-full">
                    <div className={`size-10 lg:size-11 rounded-lg flex items-center justify-center mb-2.5 lg:mb-3 shrink-0 group-hover:scale-110 transition-all duration-300 ${idx % 3 === 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/20' : idx % 3 === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-400/20' : 'bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md shadow-yellow-500/20'}`}>
                      <value.icon className="size-4 lg:size-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm lg:text-base dark:text-white text-slate-900 group-hover:text-amber-400 transition-colors leading-tight">{value.title}</h3>
                    <p className="text-xs lg:text-sm dark:text-white/50 text-slate-500 leading-relaxed mt-1.5 line-clamp-2">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Column — Team */}
        <motion.div variants={itemVariants} className="md:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 mb-1 shrink-0 mt-1">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-amber-400" />
            <h2 className="text-base lg:text-lg font-semibold dark:text-white/90 text-slate-800 uppercase tracking-wider">Our Team</h2>
            <span className="text-xs dark:text-white/30 text-slate-400 ml-auto hidden md:inline">Click to explore</span>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2 flex-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="dark:bg-white/[0.04] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06]">
                  <div className="p-3 flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {/* Desktop: Expand cards */}
              <div className="hidden lg:flex flex-col gap-2">
                {team.map((member) => (
                  <TeamExpandCard key={member.id} member={member} />
                ))}
              </div>
              {/* Mobile/Tablet: Flip cards */}
              <div className="lg:hidden flex flex-col gap-2">
                {team.map((member) => (
                  <TeamFlipCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Bottom — Awards Bar (overlaps the grid above) */}
      <motion.div
        className="shrink-0 mx-4 md:mx-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="rounded-xl dark:bg-[#0c1117]/95 bg-white/95 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/30 border border-slate-100 dark:border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-4 overflow-x-auto custom-scrollbar pb-1">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="size-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Award className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold dark:text-white/70 text-slate-600 uppercase tracking-wider">Awards</span>
            </div>
            <div className="w-px h-6 dark:bg-white/[0.08] bg-slate-200 shrink-0" />
            {awards.map((award, index) => (
              <motion.div
                key={award.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.08 }}
                className="shrink-0"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg dark:bg-white/[0.03] bg-slate-50 shadow-sm border border-slate-100 dark:border-white/[0.06] hover:border-amber-500/30 dark:hover:bg-white/[0.05] hover:bg-slate-100 transition-all duration-300 group cursor-default">
                  <div className="size-8 shrink-0 rounded-md bg-gradient-to-br from-amber-900/40 to-amber-900/60 flex items-center justify-center group-hover:shadow-md transition-shadow duration-300">
                    <Award className="size-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold dark:text-white/90 text-slate-800 truncate max-w-[200px]">{award.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/20 px-2 py-0.5 font-semibold">{award.year}</Badge>
                      <span className="text-xs dark:text-white/35 text-slate-400 truncate max-w-[160px]">{award.organization}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
