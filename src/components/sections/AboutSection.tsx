'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Target, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import Image from 'next/image';

function AnimatedStat({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const { displayValue, ref } = useAnimatedCounter({ end: value, suffix, startOnView: false, startDelay: delay });
  return (
    <div className="text-center" ref={ref}>
      <div className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-amber-400 mb-1 tabular-nums">{displayValue}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

const highlights = [
  { icon: Target, title: 'Our Mission', text: 'To deliver innovative IT solutions that empower businesses to achieve their digital transformation goals and drive sustainable growth.', gradient: 'from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-900/10', border: 'border-amber-200 dark:border-amber-800' },
  { icon: Eye, title: 'Our Vision', text: 'To be Africa\'s leading technology partner, recognized for excellence, innovation, and the positive impact we create for our clients.', gradient: 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/5', border: 'border-amber-200 dark:border-amber-800' },
];

export default function AboutSection() {
  const { navigate } = useAppStore();

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-900/50" id="about">
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">Who We Are</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-6 text-slate-900 dark:text-white">
              Innovating the Future of{' '}
              <span className="text-gradient" aria-label="Technology">Technology</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Lightworld Technologies is a premier IT solutions company based in Ghana. Since our founding, we have been committed to delivering world-class technology services that help businesses of all sizes achieve their goals.
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              Our team of skilled developers, designers, and digital strategists work collaboratively to craft solutions that are not only technically excellent but also aligned with our clients&apos; business objectives. We believe in building lasting partnerships through trust, transparency, and tangible results.
            </p>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {highlights.map((item) => (
                <motion.div
                  key={item.title}
                  className={`flex gap-3 p-5 rounded-xl bg-gradient-to-br ${item.gradient} border ${item.border} hover:shadow-md transition-all duration-300`}
                  whileHover={{ y: -2 }}
                >
                  <div className="size-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0">
                    <item.icon className="size-5 text-emerald-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">{item.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button
              onClick={() => navigate('about')}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-amber-500 dark:hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-shadow"
            >
              Learn More About Us
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </motion.div>

          {/* Right: Team image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Gradient border wrapper */}
            <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-br from-emerald-400 via-amber-400 to-emerald-500 opacity-75 blur-[1px]" />
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-xl"
              whileHover={{ y: -8, transition: { duration: 0.4, ease: 'easeOut' } }}
            >
              <Image
                src="/images/about-team.png"
                alt="Lightworld Technologies team of African tech professionals"
                width={1152}
                height={864}
                className="w-full h-auto object-cover rounded-2xl"
                priority
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Compact stats row below the main grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm text-center"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedStat value={200} suffix="+" label="Projects Completed" delay={0} />
          </motion.div>
          <motion.div
            className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm text-center"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedStat value={150} suffix="+" label="Happy Clients" delay={200} />
          </motion.div>
          <motion.div
            className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm text-center"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedStat value={8} suffix="+" label="Years Experience" delay={400} />
          </motion.div>
          <motion.div
            className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm text-center"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedStat value={99} suffix="%" label="Success Rate" delay={600} />
          </motion.div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <motion.div
            className="p-6 rounded-xl bg-gradient-to-br from-amber-600 via-amber-500 to-amber-800 dark:from-amber-500 dark:via-amber-800 dark:to-amber-900 text-white shadow-lg shadow-amber-900/20 dark:shadow-amber-950/40 hover:shadow-xl dark:hover:shadow-amber-950/50 transition-all duration-300 relative overflow-hidden"
            whileHover={{ scale: 1.01 }}
          >
            {/* Decorative gradient shapes */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />
            <h4 className="font-semibold mb-3 relative">Why Choose Us?</h4>
            <ul className="space-y-2 relative">
              {['Award-winning IT solutions', 'Dedicated support team', 'Agile development methodology', 'Competitive pricing'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-amber-50 dark:text-amber-100">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
