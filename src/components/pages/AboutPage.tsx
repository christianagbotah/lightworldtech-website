'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Lightbulb, Shield, Award, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

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
      <section className="section-padding bg-white">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Our Story</span>
              <h2 className="text-3xl font-bold mt-2 mb-6">Building the Future of Technology in Africa</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
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
              {[
                { value: '100+', label: 'Projects Delivered', icon: '🚀' },
                { value: '100+', label: 'Happy Clients', icon: '😊' },
                { value: '8+', label: 'Years Experience', icon: '📅' },
                { value: '50+', label: 'Team Members', icon: '👥' },
              ].map((stat) => (
                <Card key={stat.label} className="border-slate-200">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-2xl font-bold text-emerald-600">{stat.value}</div>
                    <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-slate-50">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <Target className="size-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Our Mission</h3>
                  <p className="text-slate-600 leading-relaxed">
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
              <Card className="h-full border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-8">
                  <div className="size-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                    <Eye className="size-6 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Our Vision</h3>
                  <p className="text-slate-600 leading-relaxed">
                    To be Africa&apos;s most trusted technology partner, recognized globally for our commitment to innovation, quality, and the positive impact we create for businesses and communities through technology.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl font-bold mt-2 mb-4">Core Values That Drive Us</h2>
            <p className="text-slate-600">The principles that guide everything we do at Lightworld Technologies.</p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value) => (
              <motion.div key={value.title} variants={itemVariants}>
                <Card className="h-full border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="size-11 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                      <value.icon className="size-5 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding bg-slate-50">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Our Team</span>
            <h2 className="text-3xl font-bold mt-2 mb-4">Meet the Experts</h2>
            <p className="text-slate-600">The talented people behind our success.</p>
          </motion.div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
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
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {team.map((member) => (
                <motion.div key={member.id} variants={itemVariants}>
                  <Card className="overflow-hidden border-slate-200 hover:shadow-lg transition-all group">
                    <div className="h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 relative overflow-hidden">
                      <div className="absolute inset-0 grid-pattern opacity-30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-20 rounded-full bg-emerald-300/50 flex items-center justify-center text-2xl font-bold text-emerald-700">
                          {member.name.charAt(0)}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-emerald-600 font-medium mb-2">{member.role}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{member.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Awards */}
      <section className="section-padding bg-white">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Recognition</span>
            <h2 className="text-3xl font-bold mt-2 mb-4">Awards & Achievements</h2>
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
                <Card className="h-full border-amber-200 bg-gradient-to-br from-amber-50 to-white text-center">
                  <CardContent className="p-6">
                    <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <Award className="size-6 text-amber-600" />
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 mb-3">{award.year}</Badge>
                    <h3 className="font-semibold text-sm mb-1">{award.title}</h3>
                    <p className="text-xs text-slate-500">{award.organization}</p>
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
