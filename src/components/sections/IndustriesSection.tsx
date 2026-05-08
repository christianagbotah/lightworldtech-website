'use client';

import { motion } from 'framer-motion';
import { GraduationCap, ShoppingBag, Hotel, Building2, HeartPulse, Shield, Home, Plane, UtensilsCrossed, Factory, HandHeart } from 'lucide-react';

const industries = [
  { name: 'Education', icon: GraduationCap },
  { name: 'E-Commerce', icon: ShoppingBag },
  { name: 'Hospitality', icon: Hotel },
  { name: 'Corporate', icon: Building2 },
  { name: 'Healthcare', icon: HeartPulse },
  { name: 'Security', icon: Shield },
  { name: 'Real Estate', icon: Home },
  { name: 'Travel', icon: Plane },
  { name: 'Restaurant', icon: UtensilsCrossed },
  { name: 'Manufacturing', icon: Factory },
  { name: 'Charity', icon: HandHeart },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

export default function IndustriesSection() {
  return (
    <section className="section-padding bg-white dark:bg-slate-900">
      <div className="container-main">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Industries</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Industries We Serve</h2>
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
          viewport={{ once: true, margin: '-100px' }}
        >
          {industries.map((industry) => (
            <motion.div
              key={industry.name}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <div className="flex flex-col items-center p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-300 cursor-default">
                <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors">
                  <industry.icon className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{industry.name}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
