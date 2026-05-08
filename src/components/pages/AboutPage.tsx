'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Lightbulb, Shield, Award, ChevronRight, ChevronLeft, Rocket, UserCheck, Calendar, UsersRound, Twitter, Linkedin, Globe, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const values = [
  { icon: Lightbulb, title: 'Innovation', description: 'We embrace new technologies and creative approaches to solve complex challenges.' },
  { icon: Heart, title: 'Passion', description: 'We are driven by a genuine passion for technology and the positive impact it creates.' },
  { icon: Shield, title: 'Integrity', description: 'We conduct business with transparency, honesty, and a strong ethical foundation.' },
  { icon: Users, title: 'Collaboration', description: 'We believe in the power of teamwork and building strong partnerships with our clients.' },
  { icon: Award, title: 'Excellence', description: 'We strive for the highest quality in everything we do, from code to customer service.' },
  { icon: Target, title: 'Results-Driven', description: 'We focus on delivering measurable outcomes that create real business value.' },
];

const defaultTeam = [
  { id: '1', name: 'Emmanuel Osei', role: 'Founder & CEO', bio: 'Visionary leader with 10+ years in IT solutions and digital transformation across Africa.' },
  { id: '2', name: 'Kwame Asante', role: 'Lead Developer', bio: 'Full-stack developer with expertise in modern web and mobile technologies.' },
  { id: '3', name: 'Abena Mensah', role: 'UI/UX Designer', bio: 'Award-winning designer passionate about creating intuitive user experiences.' },
  { id: '4', name: 'Kofi Amponsah', role: 'Digital Marketing Lead', bio: 'Digital marketing expert specializing in SEO, social media, and growth strategies.' },
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

function AnimatedStatCard({ value, suffix, label, icon: Icon, delay = 0 }: { value: number; suffix: string; label: string; icon: React.ElementType; delay?: number }) {
  const { displayValue, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <Card ref={ref} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-lg dark:hover:shadow-emerald-900/20 transition-all duration-300 group">
      <CardContent className="p-6 text-center">
        <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 flex items-center justify-center mx-auto mb-3 group-hover:shadow-md transition-shadow duration-300">
          <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{displayValue}</div>
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

export default function AboutPage() {
  const { navigate } = useAppStore();
  const [team, setTeam] = useState(defaultTeam);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = 296; // 280px + 16px gap
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
        if (Array.isArray(data) && data.length > 0) setTeam(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-emerald-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-emerald-400">About Us</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            About <span className="text-emerald-400">Lightworld Technologies</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            A passionate team of innovators dedicated to transforming businesses through technology.
          </motion.p>
        </div>
      </section>

      {/* Company Story */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Our Story</span>
              <h2 className="text-3xl font-bold mt-2 mb-6 text-slate-900 dark:text-white">Building the Future of Technology in Africa</h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Founded with a vision to bridge the technology gap in Africa, Lightworld Technologies has grown from a small startup to a leading IT solutions provider. Our journey began with a simple belief: that every business, regardless of size, deserves access to world-class technology solutions.
                </p>
                <p>
                  Over the years, we have built a reputation for excellence, innovation, and client satisfaction. Our team of talented professionals brings diverse expertise and a shared passion for creating impactful digital solutions that drive real business outcomes.
                </p>
                <p>
                  Today, we serve clients across multiple industries, from startups to established enterprises, helping them navigate the digital landscape and achieve sustainable growth through technology.
                </p>
              </div>
            </motion.div>
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <AnimatedStatCard value={stat.value} suffix={stat.suffix} label={stat.label} icon={stat.icon} delay={index * 200} />
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                    <Target className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Our Mission</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    To deliver innovative, reliable, and scalable IT solutions that empower businesses across Africa to achieve digital transformation, drive growth, and compete effectively in the global marketplace.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
                    <Eye className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Our Vision</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    To be Africa&apos;s most trusted technology partner, recognized globally for our commitment to innovation, quality, and the positive impact we create for businesses and communities through technology.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Core Values That Drive Us</h2>
            <p className="text-slate-600 dark:text-slate-300">The principles that guide everything we do at Lightworld Technologies.</p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, idx) => (
              <motion.div key={value.title} variants={itemVariants}>
                <Card className="h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-lg dark:hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
                  {/* Gradient corner decoration */}
                  <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    idx % 3 === 0 ? 'bg-emerald-200/40 dark:bg-emerald-500/10' : idx % 3 === 1 ? 'bg-amber-200/40 dark:bg-amber-500/10' : 'bg-teal-200/40 dark:bg-teal-500/10'
                  }`} />
                  <CardContent className="p-6 relative">
                    <div className={`size-12 rounded-xl flex items-center justify-center mb-4 group-hover:shadow-md transition-all duration-300 group-hover:scale-110 ${
                      idx % 3 === 0
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/20'
                        : idx % 3 === 1
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-md shadow-amber-400/20'
                          : 'bg-gradient-to-br from-teal-500 to-teal-600 shadow-md shadow-teal-500/20'
                    }`}>
                      <value.icon className="size-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{value.title}</h3>
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
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Our Team</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Meet the Experts</h2>
            <p className="text-slate-600 dark:text-slate-300">The talented people behind our success.</p>
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
              {/* Desktop Grid */}
              <motion.div
                className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {team.map((member) => (
                  <motion.div key={member.id} variants={itemVariants}>
                    <Card className="overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl dark:hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all duration-300 group">
                      <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 relative overflow-hidden">
                        <div className="absolute inset-0 grid-pattern opacity-30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-20 rounded-full bg-emerald-300/50 dark:bg-emerald-700/40 flex items-center justify-center text-2xl font-bold text-emerald-700 dark:text-emerald-300 transition-transform duration-300 group-hover:scale-110">
                            {member.name.charAt(0)}
                          </div>
                        </div>
                        {/* Overlay slide-up effect with bio and social links */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-emerald-900/90 via-emerald-900/70 to-emerald-800/40 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                          <p className="text-sm text-white/90 text-center leading-relaxed mb-4 line-clamp-3">{member.bio}</p>
                          <div className="flex gap-2">
                            {[
                              { icon: Linkedin, label: 'LinkedIn', href: member.linkedin || '#' },
                              { icon: Twitter, label: 'Twitter', href: member.twitter || '#' },
                              { icon: Mail, label: 'Email', href: member.email ? `mailto:${member.email}` : '#' },
                              { icon: Globe, label: 'Website', href: '#' },
                            ].map(({ icon: SocialIcon, label, href }) => (
                              <a
                                key={label}
                                href={href}
                                aria-label={label}
                                className="size-8 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-emerald-400 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                              >
                                <SocialIcon className="size-3.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{member.name}</h3>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{member.role}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Mobile Carousel */}
              <div className="lg:hidden">
                <div
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 px-1"
                  ref={scrollRef}
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={handleScroll}
                >
                  {team.map((member) => (
                    <div key={member.id} className="flex-shrink-0 w-[280px] snap-center">
                      <Card className="overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full">
                        <div className="h-40 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 relative overflow-hidden">
                          <div className="absolute inset-0 grid-pattern opacity-30" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="size-16 rounded-full bg-emerald-300/50 dark:bg-emerald-700/40 flex items-center justify-center text-xl font-bold text-emerald-700 dark:text-emerald-300">
                              {member.name.charAt(0)}
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent pt-6 pb-2 px-3">
                            <div className="flex justify-center gap-1.5">
                              {[
                                { icon: Linkedin, label: 'LinkedIn' },
                                { icon: Twitter, label: 'Twitter' },
                                { icon: Mail, label: 'Email' },
                                { icon: Globe, label: 'Website' },
                              ].map(({ icon: SocialIcon, label }) => (
                                <button
                                  key={label}
                                  aria-label={label}
                                  className="size-7 rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-emerald-500 flex items-center justify-center transition-colors duration-200"
                                >
                                  <SocialIcon className="size-3" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-base text-slate-900 dark:text-white">{member.name}</h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">{member.role}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{member.bio}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full border-slate-300 dark:border-slate-600"
                    onClick={() => scrollCarousel(-1)}
                    aria-label="Previous team member"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {team.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => scrollToSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === currentSlide ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full border-slate-300 dark:border-slate-600"
                    onClick={() => scrollCarousel(1)}
                    aria-label="Next team member"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Awards */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Recognition</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Awards & Achievements</h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {awards.map((award) => (
              <motion.div key={award.title} variants={itemVariants}>
                <Card className="h-full border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-900/20 dark:via-slate-800 dark:to-amber-900/10 text-center hover:shadow-lg dark:hover:shadow-amber-900/20 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                  {/* Decorative corner gradient */}
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
