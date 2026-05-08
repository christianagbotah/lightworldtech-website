'use client';

import { motion } from 'framer-motion';
import { GraduationCap, ShoppingBag, Hotel, Building2, HeartPulse, Shield, Home, Plane, UtensilsCrossed, Factory, HandHeart } from 'lucide-react';

const industries = [
  { name: 'Education', icon: GraduationCap, color: 'from-amber-400 to-yellow-500' },
  { name: 'E-Commerce', icon: ShoppingBag, color: 'from-amber-400 to-orange-500' },
  { name: 'Hospitality', icon: Hotel, color: 'from-rose-400 to-pink-500' },
  { name: 'Corporate', icon: Building2, color: 'from-slate-500 to-slate-700' },
  { name: 'Healthcare', icon: HeartPulse, color: 'from-amber-500 to-amber-600' },
  { name: 'Security', icon: Shield, color: 'from-amber-500 to-amber-600' },
  { name: 'Real Estate', icon: Home, color: 'from-yellow-400 to-cyan-500' },
  { name: 'Travel', icon: Plane, color: 'from-amber-400 to-amber-600' },
  { name: 'Restaurant', icon: UtensilsCrossed, color: 'from-orange-400 to-red-500' },
  { name: 'Manufacturing', icon: Factory, color: 'from-slate-400 to-slate-600' },
  { name: 'Charity', icon: HandHeart, color: 'from-amber-400 to-yellow-500' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, type: 'spring', stiffness: 150 } },
};

export default function IndustriesSection() {
  return (
    <section className="section-padding bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Subtle mesh background */}
      <div className="absolute inset-0 mesh-pattern opacity-40 dark:opacity-20" />

      {/* Decorative orbs */}
      <div className="absolute top-20 right-10 w-48 h-48 bg-amber-400/8 rounded-full blur-3xl animate-breathe" />
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '-2s' }} />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Industries</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Industries We <span className="text-gradient-amber">Serve</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            We deliver tailored technology solutions across diverse industries, helping organizations innovate and achieve their unique business objectives.
          </p>
        </motion.div>

        {/* Industries grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {industries.map((industry) => (
            <motion.div
              key={industry.name}
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              <div className="group relative flex flex-col items-center p-6 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-300 cursor-default overflow-hidden shimmer-sweep">
                {/* Background glow effect */}
                <div className={`absolute -inset-px bg-gradient-to-br ${industry.color} opacity-0 group-hover:opacity-[0.07] rounded-xl transition-opacity duration-500`} />
                <div className={`absolute -inset-2 bg-gradient-to-r ${industry.color} opacity-0 group-hover:opacity-10 rounded-xl blur-xl transition-all duration-500`} />

                {/* Icon with gradient on hover */}
                <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-3 group-hover:shadow-md transition-all duration-300 relative">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${industry.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <industry.icon className="size-6 text-amber-600 dark:text-amber-400 group-hover:text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 relative group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                  {industry.name}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
