'use client';

import { motion } from 'framer-motion';

interface TechItem {
  name: string;
  initials: string;
  gradient: string;
  dotColor: string;
  hoverBorder: string;
}

const row1: TechItem[] = [
  { name: 'React', initials: 'R', gradient: 'from-cyan-400 to-cyan-600', dotColor: 'bg-cyan-400', hoverBorder: 'hover:border-cyan-400/60 dark:hover:border-cyan-400/40' },
  { name: 'Next.js', initials: 'N', gradient: 'from-slate-600 to-slate-800', dotColor: 'bg-slate-500', hoverBorder: 'hover:border-slate-400/60 dark:hover:border-slate-400/40' },
  { name: 'TypeScript', initials: 'TS', gradient: 'from-blue-400 to-blue-600', dotColor: 'bg-blue-400', hoverBorder: 'hover:border-blue-400/60 dark:hover:border-blue-400/40' },
  { name: 'Node.js', initials: 'No', gradient: 'from-green-400 to-green-600', dotColor: 'bg-green-500', hoverBorder: 'hover:border-green-400/60 dark:hover:border-green-400/40' },
  { name: 'Python', initials: 'Py', gradient: 'from-yellow-400 to-yellow-600', dotColor: 'bg-yellow-400', hoverBorder: 'hover:border-yellow-400/60 dark:hover:border-yellow-400/40' },
  { name: 'Django', initials: 'Dj', gradient: 'from-green-600 to-emerald-700', dotColor: 'bg-green-600', hoverBorder: 'hover:border-green-500/60 dark:hover:border-green-500/40' },
];

const row2: TechItem[] = [
  { name: 'Flutter', initials: 'Fl', gradient: 'from-sky-400 to-sky-600', dotColor: 'bg-sky-400', hoverBorder: 'hover:border-sky-400/60 dark:hover:border-sky-400/40' },
  { name: 'React Native', initials: 'RN', gradient: 'from-cyan-500 to-cyan-700', dotColor: 'bg-cyan-500', hoverBorder: 'hover:border-cyan-400/60 dark:hover:border-cyan-400/40' },
  { name: 'PostgreSQL', initials: 'PG', gradient: 'from-blue-500 to-indigo-600', dotColor: 'bg-blue-500', hoverBorder: 'hover:border-blue-400/60 dark:hover:border-blue-400/40' },
  { name: 'MongoDB', initials: 'M', gradient: 'from-green-500 to-green-700', dotColor: 'bg-green-500', hoverBorder: 'hover:border-green-500/60 dark:hover:border-green-500/40' },
  { name: 'AWS', initials: 'AW', gradient: 'from-orange-400 to-orange-600', dotColor: 'bg-orange-400', hoverBorder: 'hover:border-orange-400/60 dark:hover:border-orange-400/40' },
  { name: 'Docker', initials: 'Dk', gradient: 'from-blue-400 to-blue-600', dotColor: 'bg-blue-400', hoverBorder: 'hover:border-blue-400/60 dark:hover:border-blue-400/40' },
];

const row3: TechItem[] = [
  { name: 'Firebase', initials: 'FB', gradient: 'from-amber-400 to-yellow-500', dotColor: 'bg-amber-400', hoverBorder: 'hover:border-amber-400/60 dark:hover:border-amber-400/40' },
  { name: 'Tailwind CSS', initials: 'TW', gradient: 'from-teal-400 to-cyan-500', dotColor: 'bg-teal-400', hoverBorder: 'hover:border-teal-400/60 dark:hover:border-teal-400/40' },
  { name: 'GraphQL', initials: 'GQ', gradient: 'from-pink-400 to-pink-600', dotColor: 'bg-pink-400', hoverBorder: 'hover:border-pink-400/60 dark:hover:border-pink-400/40' },
  { name: 'Redis', initials: 'Rd', gradient: 'from-red-400 to-red-600', dotColor: 'bg-red-400', hoverBorder: 'hover:border-red-400/60 dark:hover:border-red-400/40' },
  { name: 'Kubernetes', initials: 'K8', gradient: 'from-blue-500 to-blue-700', dotColor: 'bg-blue-500', hoverBorder: 'hover:border-blue-400/60 dark:hover:border-blue-400/40' },
  { name: 'Figma', initials: 'Fi', gradient: 'from-violet-400 to-purple-600', dotColor: 'bg-violet-400', hoverBorder: 'hover:border-violet-400/60 dark:hover:border-violet-400/40' },
];

function MarqueeRow({
  items,
  duration,
  direction,
  delay,
}: {
  items: TechItem[];
  duration: string;
  direction: 'normal' | 'reverse';
  delay: number;
}) {
  // Double items for seamless infinite loop
  const doubled = [...items, ...items];

  return (
    <motion.div
      className="relative mb-5 last:mb-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

      {/* Marquee track */}
      <div
        className="flex gap-4 animate-marquee"
        style={{
          animationDuration: duration,
          animationDirection: direction,
        }}
      >
        {doubled.map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm shadow-sm hover:shadow-lg dark:shadow-slate-900/20 ${tech.hoverBorder} transition-all duration-300 group cursor-default hover:scale-105`}
          >
            {/* Colored icon circle with initials */}
            <div
              className={`size-10 rounded-xl bg-gradient-to-br ${tech.gradient} flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300`}
            >
              {tech.initials}
            </div>

            {/* Tech name */}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300">
              {tech.name}
            </span>

            {/* Subtle colored dot badge */}
            <span
              className={`size-2 rounded-full ${tech.dotColor} opacity-60 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0`}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function TechStackSection() {
  return (
    <section className="section-padding bg-white dark:bg-slate-900 relative overflow-hidden" id="tech-stack">
      {/* Dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-40 dark:opacity-30 pointer-events-none" />

      {/* Subtle decorative blurs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-100/40 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-amber-100/30 dark:bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">
            Our Technology Arsenal
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Built with Industry-Leading Technologies
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            We leverage the most powerful and modern technology stacks to deliver exceptional results for our clients.
          </p>
        </motion.div>

        {/* Marquee rows */}
        <div className="space-y-0">
          <MarqueeRow
            items={row1}
            duration="30s"
            direction="normal"
            delay={0.15}
          />
          <MarqueeRow
            items={row2}
            duration="35s"
            direction="reverse"
            delay={0.3}
          />
          <MarqueeRow
            items={row3}
            duration="25s"
            direction="normal"
            delay={0.45}
          />
        </div>
      </div>
    </section>
  );
}
