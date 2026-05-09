'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Lightbulb, PenTool, Code, TestTube, Rocket, BarChart3, Wrench, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-3xl" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">How We Work</span>
          <div className="flex items-center justify-center gap-3 mt-3 mb-1">
            <span className="block w-8 h-[2px] bg-gradient-to-r from-transparent to-emerald-500 dark:to-amber-400 rounded-full" />
            <span className="block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-amber-400 shadow-sm shadow-emerald-500/50 dark:shadow-amber-400/50" />
            <span className="block w-8 h-[2px] bg-gradient-to-l from-transparent to-emerald-500 dark:to-amber-400 rounded-full" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Our Development Process</h2>
          <p className="text-slate-600 dark:text-slate-300">
            A proven, structured approach that ensures every project is delivered on time, within budget, and exceeds expectations.
          </p>
        </motion.div>

        {/* Two-column: Image + Process steps */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <Skeleton className="w-full h-80 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-5">
                  <Skeleton className="size-10 rounded-full mb-3" />
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Process workflow image */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/images/process-workflow.png"
                  alt="Our technology development process workflow"
                  width={1152}
                  height={864}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
              {/* Decorative gradient accent below image */}
              <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 opacity-60" />
            </motion.div>

            {/* Right: Process steps with timeline */}
            <div className="relative">
              {/* Vertical timeline connector line */}
              <div className="absolute left-[1.3rem] top-4 bottom-4 w-[2px] bg-gradient-to-b from-emerald-400/30 via-amber-400/20 to-emerald-400/30 rounded-full hidden lg:block" />
              {/* Glow dot at top of timeline */}
              <div className="absolute left-[1.1rem] top-2 size-[6px] rounded-full bg-emerald-400/50 blur-[2px] hidden lg:block" />
              {/* Glow dot at bottom of timeline */}
              <div className="absolute left-[1.1rem] bottom-2 size-[6px] rounded-full bg-amber-400/50 blur-[2px] hidden lg:block" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {steps.map((step, index) => {
                const IconComp = iconMap[step.icon] || Code;
                return (
                  <motion.div
                    key={step.id}
                    className="relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                  >
                    <div className="p-5 rounded-xl bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 dark:hover:shadow-amber-900/20 hover:border-emerald-300 dark:hover:border-amber-500/50 transition-all duration-500 h-full hover:-translate-y-1.5 group relative overflow-hidden hover:scale-[1.02]">
                      {/* Subtle gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/0 to-amber-50/50 dark:from-amber-900/0 dark:to-amber-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

                      {/* Step number + icon row */}
                      <div className="flex items-center gap-4 mb-3 relative">
                        <motion.div
                          className="relative size-12 shrink-0"
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: index * 0.08 + 0.2, type: 'spring', stiffness: 200 }}
                        >
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-400/30 animate-pulse" />
                          <div className="relative size-12 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500 dark:from-amber-400 dark:via-amber-500 dark:to-emerald-400 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-emerald-500/30 dark:shadow-amber-900/40 ring-2 ring-white/60 dark:ring-slate-700/60">
                            {step.number || index + 1}
                          </div>
                        </motion.div>
                        <div className="size-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/40 dark:to-amber-900/20 flex items-center justify-center group-hover:shadow-md transition-all duration-500">
                          <IconComp className="size-5 text-emerald-600 dark:text-amber-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:scale-110 transition-all duration-500" />
                        </div>
                      </div>

                      <h3 className="font-semibold text-sm mb-1.5 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors duration-300">{step.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed relative">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
