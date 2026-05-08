'use client';

import { motion } from 'framer-motion';

const partnerLogos = [
  { name: 'TechGhana Inc.', initials: 'TG', color: 'from-amber-400 to-amber-600' },
  { name: 'Accra Digital Hub', initials: 'AD', color: 'from-amber-400 to-amber-600' },
  { name: 'AfricanBiz Corp', initials: 'AB', color: 'from-slate-500 to-slate-700' },
  { name: 'DataFlow Systems', initials: 'DF', color: 'from-cyan-400 to-cyan-600' },
  { name: 'GreenTech Solutions', initials: 'GT', color: 'from-green-400 to-green-600' },
  { name: 'MediConnect Health', initials: 'MC', color: 'from-rose-400 to-rose-600' },
  { name: 'EduPrime Academy', initials: 'EP', color: 'from-violet-400 to-violet-600' },
  { name: 'FreshBite Foods', initials: 'FB', color: 'from-orange-400 to-orange-600' },
  { name: 'Premier Hotels', initials: 'PH', color: 'from-yellow-400 to-yellow-600' },
  { name: 'BuildRight Ltd.', initials: 'BR', color: 'from-blue-400 to-blue-600' },
  { name: 'SwiftPay Ghana', initials: 'SP', color: 'from-amber-500 to-yellow-500' },
  { name: 'AgriTech Solutions', initials: 'AT', color: 'from-lime-500 to-green-600' },
];

// Double the array for seamless infinite scroll
const allLogos = [...partnerLogos, ...partnerLogos];

export default function ClientLogoCarousel() {
  return (
    <section className="py-14 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Subtle top/bottom gradients for fade effect */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-10" />

      <div className="container-main mb-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trusted Partners &amp; Clients</span>
        </motion.div>
      </div>

      {/* Scrolling row 1 - left to right */}
      <div className="relative mb-4">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />

        <div className="flex gap-4 animate-marquee">
          {allLogos.slice(0, 12).map((logo, i) => (
            <div
              key={`row1-${i}`}
              className="flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-300 group cursor-default"
            >
              <div className={`size-9 rounded-lg bg-gradient-to-br ${logo.color} flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300`}>
                {logo.initials}
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrolling row 2 - right to left */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />

        <div className="flex gap-4 animate-marquee" style={{ animationDirection: 'reverse', animationDuration: '35s' }}>
          {allLogos.slice(3, 15).map((logo, i) => (
            <div
              key={`row2-${i}`}
              className="flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-300 group cursor-default"
            >
              <div className={`size-9 rounded-lg bg-gradient-to-br ${logo.color} flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300`}>
                {logo.initials}
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
