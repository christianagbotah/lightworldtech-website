'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Lightbulb, PenTool, Code, TestTube, Rocket, BarChart3, Wrench, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultSteps = [
  { id: '1', number: 1, title: 'Discovery & Research', description: 'We begin by understanding your business goals, target audience, and project requirements through in-depth research and consultation.', icon: 'Search' },
  { id: '2', number: 2, title: 'Ideation & Strategy', description: 'Our team brainstorms creative solutions and develops a strategic roadmap aligned with your business objectives.', icon: 'Lightbulb' },
  { id: '3', number: 3, title: 'UX/UI Design', description: 'We create intuitive, visually stunning designs that prioritize user experience and reflect your brand identity.', icon: 'PenTool' },
  { id: '4', number: 4, title: 'Development', description: 'Our expert developers bring the designs to life using cutting-edge technologies and best coding practices.', icon: 'Code' },
  { id: '5', number: 5, title: 'Quality Assurance', description: 'Rigorous testing ensures your product is bug-free, performant, and meets the highest quality standards.', icon: 'TestTube' },
  { id: '6', number: 6, title: 'Launch & Deployment', description: 'We handle the seamless deployment of your project, ensuring a smooth go-live experience.', icon: 'Rocket' },
  { id: '7', number: 7, title: 'Monitoring & Analytics', description: 'Post-launch monitoring and analytics help us track performance and gather valuable insights.', icon: 'BarChart3' },
  { id: '8', number: 8, title: 'Maintenance & Support', description: 'Ongoing support, updates, and maintenance to keep your solution running at peak performance.', icon: 'Wrench' },
];

const iconMap: Record<string, React.ElementType> = {
  Search, Lightbulb, PenTool, Code, TestTube, Rocket, BarChart3, Wrench, MessageSquare,
};

export default function ProcessSection() {
  const [steps, setSteps] = useState(defaultSteps);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher('/api/process-steps')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setSteps(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">How We Work</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Our Development Process</h2>
          <p className="text-slate-600 dark:text-slate-300">
            A proven, structured approach that ensures every project is delivered on time, within budget, and exceeds expectations.
          </p>
        </motion.div>

        {/* Process steps */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-6">
                <Skeleton className="size-12 rounded-full mb-4" />
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting gradient line - desktop (SVG for self-drawing animation) */}
            <svg className="hidden lg:block absolute top-[28px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-2 z-0 pointer-events-none" preserveAspectRatio="none">
              <line
                x1="0" y1="4" x2="100%" y2="4"
                stroke="url(#process-gradient)"
                strokeWidth="2"
                strokeDasharray="8 6"
                className="animate-draw-line"
              />
              <defs>
                <linearGradient id="process-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(0.696 0.17 162.48)" />
                  <stop offset="50%" stopColor="oklch(0.769 0.188 70.08)" />
                  <stop offset="100%" stopColor="oklch(0.696 0.17 162.48)" />
                </linearGradient>
              </defs>
            </svg>

            {steps.map((step, index) => {
              const IconComp = iconMap[step.icon] || Code;
              return (
                <motion.div
                  key={step.id}
                  className="relative z-10"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <div className="p-6 rounded-xl bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-xl dark:hover:shadow-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all duration-500 h-full hover:-translate-y-2 group relative overflow-hidden">
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/0 to-emerald-50/50 dark:from-emerald-900/0 dark:to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

                    {/* Step number with gradient, pulse, and scale animation */}
                    <div className="flex items-center gap-3 mb-4 relative">
                      <motion.div
                        className="relative size-10"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.08 + 0.2, type: 'spring', stiffness: 200 }}
                      >
                        {/* Pulse ring effect */}
                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
                        <div className="relative size-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-500 dark:to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/25 dark:shadow-emerald-900/40 group-hover:shadow-emerald-500/40 transition-shadow duration-300">
                          {step.number || index + 1}
                        </div>
                      </motion.div>
                      <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 dark:from-emerald-800 to-transparent" />
                    </div>

                    {/* Icon with hover animation */}
                    <div className="size-11 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/40 dark:to-emerald-900/20 flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md group-hover:from-emerald-100 group-hover:to-amber-100 dark:group-hover:from-emerald-800/40 dark:group-hover:to-amber-900/20 transition-all duration-500 relative">
                      <IconComp className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
                    </div>

                    <h3 className="font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">{step.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed relative">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
