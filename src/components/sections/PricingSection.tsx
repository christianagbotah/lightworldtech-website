'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, Zap, Crown, Building2, Star, Shield, Clock, Headphones } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

interface PricingTier {
  id: string;
  name: string;
  icon: React.ElementType;
  monthlyPrice: number | null;
  annualPrice: number | null;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
}

const tiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    monthlyPrice: 499,
    annualPrice: 399,
    description: 'Perfect for small businesses getting started with their online presence.',
    features: [
      'Responsive Website Design',
      'Up to 5 Pages',
      'Basic SEO Setup',
      'Contact Form Integration',
      'Mobile Optimization',
      '1 Month Free Support',
      'SSL Certificate',
      'Google Analytics Setup',
    ],
    popular: false,
    cta: 'Get Started',
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Crown,
    monthlyPrice: 999,
    annualPrice: 799,
    description: 'Ideal for growing businesses that need advanced features and functionality.',
    features: [
      'Everything in Starter',
      'Up to 15 Pages',
      'Custom Web Application',
      'Advanced SEO & Analytics',
      'Content Management System',
      'E-commerce Integration',
      'Email Marketing Setup',
      'Social Media Integration',
      '3 Months Free Support',
      'Performance Optimization',
    ],
    popular: true,
    cta: 'Get Started',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    monthlyPrice: null,
    annualPrice: null,
    description: 'Tailored solutions for large organizations with complex requirements.',
    features: [
      'Everything in Professional',
      'Unlimited Pages',
      'Custom Software Development',
      'Dedicated Project Manager',
      'Advanced Security Features',
      'API Integrations',
      'Cloud Hosting & Deployment',
      '24/7 Priority Support',
      'Regular Updates & Maintenance',
      'Training & Documentation',
    ],
    popular: false,
    cta: 'Contact Us',
  },
];

const trustBadges = [
  { icon: Shield, label: 'Secure Payment' },
  { icon: Headphones, label: '24/7 Support' },
  { icon: Clock, label: 'Fast Delivery' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.4 + i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { navigate } = useAppStore();

  const handleCTA = (tier: PricingTier) => {
    if (tier.id === 'enterprise') {
      navigate('contact');
    } else {
      navigate('contact');
    }
  };

  return (
    <section id="pricing" className="section-padding bg-slate-50 dark:bg-slate-800/50 relative overflow-hidden">
      {/* Dotted pattern background */}
      <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]" style={{
        backgroundImage: 'radial-gradient(circle, #059669 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Morphing decorative blobs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl animate-morph-blob" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-400/8 rounded-full blur-3xl animate-morph-blob" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl animate-breathe" />

      {/* Diagonal stripe accent */}
      <div className="absolute top-0 right-0 w-72 h-72 diagonal-stripes opacity-40 dark:opacity-20 rounded-bl-full" />

      <div className="container-main relative z-10">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-300 border-amber-200 dark:border-emerald-500 mb-4 backdrop-blur-sm">
            <Sparkles className="size-3 mr-1" />
            Pricing Plans
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Transparent Pricing for{' '}
            <span className="text-gradient-animated" aria-label="Every Business">
              Every Business
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Choose the plan that best fits your needs. All plans include professional design and quality support.
          </p>
        </motion.div>

        {/* Monthly/Annual Toggle */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <span className={`text-sm font-medium transition-colors duration-300 ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-inner gradient-border-all"
            style={{
              background: isAnnual
                ? 'linear-gradient(to right, #059669, #d97706)'
                : '#e2e8f0',
            }}
            aria-label={`Switch to ${isAnnual ? 'monthly' : 'annual'} billing`}
          >
            <motion.span
              className="inline-block h-7 w-7 rounded-full bg-white shadow-lg ring-1 ring-black/5"
              animate={{ x: isAnnual ? 30 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors duration-300 ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            Annual
          </span>
          {isAnnual && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 shadow-md shadow-emerald-500/25">
                Save 20%
              </Badge>
            </motion.div>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const isEnterprise = tier.id === 'enterprise';

            return (
              <motion.div key={tier.id} variants={itemVariants} className="h-full">
                <Card
                  className={`relative h-full overflow-hidden transition-all duration-500 group shimmer-sweep ${
                    tier.popular
                      ? 'ring-2 ring-emerald-500 dark:ring-amber-400 shadow-xl dark:shadow-amber-900/20 hover:shadow-2xl dark:hover:shadow-amber-900/40 hover:scale-[1.03] bg-gradient-to-b from-white to-amber-50/50 dark:from-slate-800 dark:to-amber-950/30'
                      : isEnterprise
                        ? 'bg-white dark:bg-slate-800 hover:shadow-2xl dark:hover:shadow-amber-900/20 hover:-translate-y-2 hover:scale-[1.02] p-[2px] rounded-2xl'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 backdrop-blur-sm hover:border-amber-300 dark:hover:border-emerald-500 hover:shadow-xl dark:hover:shadow-amber-900/20 hover:-translate-y-2 hover:scale-[1.02]'
                  }`}
                >
                  {/* Animated gradient border for enterprise */}
                  {isEnterprise && (
                    <div className="absolute inset-0 rounded-2xl p-[2px] overflow-hidden pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-500 animate-gradient-shift opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{
                        backgroundSize: '200% 200%',
                      }} />
                    </div>
                  )}

                  {/* Popular badge gradient top */}
                  {tier.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 animate-gradient-shift" style={{ backgroundSize: '200% 100%' }} />
                  )}

                  <CardContent className="p-6 sm:p-8 flex flex-col h-full relative z-10">
                    {/* Badge */}
                    {tier.popular && (
                      <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-500 text-white border-0 text-xs font-semibold shadow-lg shadow-emerald-500/20">
                        <Star className="size-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}
                    {isEnterprise && (
                      <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0 text-xs font-semibold shadow-lg shadow-emerald-500/20">
                        <Building2 className="size-3 mr-1" />
                        Premium
                      </Badge>
                    )}

                    {/* Icon and Name */}
                    <div className="mb-6">
                      <div
                        className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                          tier.popular
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-emerald-500/25'
                            : isEnterprise
                              ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40'
                              : 'bg-amber-100 dark:bg-amber-900/40 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-amber-500 group-hover:shadow-lg group-hover:shadow-emerald-500/25'
                        }`}
                      >
                        <Icon className={`size-6 transition-all duration-300 ${tier.popular || isEnterprise ? 'text-white' : 'text-emerald-600 dark:text-amber-400 group-hover:text-white group-hover:rotate-6'}`} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tier.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {price !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-slate-500 dark:text-slate-400">$</span>
                          <motion.span
                            className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums"
                            key={price}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {price}
                          </motion.span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-gradient-amber">
                            Custom
                          </span>
                        </div>
                      )}
                      {price !== null && isAnnual && (
                        <p className="text-xs text-emerald-600 dark:text-amber-400 mt-1 font-medium">
                          Billed annually (${price! * 12}/year)
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleCTA(tier)}
                      className={`w-full mb-6 transition-all duration-300 group/btn ${
                        tier.popular
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 h-11'
                          : isEnterprise
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl h-11'
                            : 'border-amber-200 dark:border-emerald-500 text-emerald-600 dark:text-amber-400 hover:bg-emerald-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-emerald-500'
                      }`}
                      variant={tier.popular || isEnterprise ? 'default' : 'outline'}
                    >
                      {tier.cta}
                      <ArrowRight className="size-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>

                    {/* Features with staggered animation */}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                        What&apos;s included
                      </p>
                      <ul className="space-y-3">
                        {tier.features.map((feature, idx) => (
                          <motion.li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm"
                            custom={idx}
                            variants={featureVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                          >
                            <CheckCircle className={`size-4 flex-shrink-0 mt-0.5 ${isEnterprise ? 'text-amber-500 dark:text-amber-400' : 'text-amber-500 dark:text-amber-400'}`} />
                            <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust badges row */}
        <motion.div
          className="flex items-center justify-center gap-8 mt-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <badge.icon className="size-4" />
              <span className="text-xs font-medium">{badge.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Bottom note */}
        <motion.p
          className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          All prices are in USD. Custom payment plans available.{' '}
          <button
            onClick={() => navigate('contact')}
            className="text-emerald-600 dark:text-amber-400 hover:underline font-medium underline-offset-2"
          >
            Contact us
          </button>{' '}
          for details.
        </motion.p>
      </div>
    </section>
  );
}
