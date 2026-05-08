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
    <section className="section-padding bg-slate-50 dark:bg-slate-900/50">
      <div className="container-main">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
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
            {/* Connecting line - desktop only */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 dark:from-emerald-800 dark:via-emerald-700 dark:to-emerald-800 z-0" />

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
                  <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-300 h-full">
                    {/* Step number with gradient */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/25 dark:shadow-emerald-900/40">
                        {step.number || index + 1}
                      </div>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>
                    {/* Icon */}
                    <div className="size-11 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
                      <IconComp className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">{step.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
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
