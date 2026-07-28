'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Smartphone, GraduationCap, TrendingUp, Code, Server,
  ChevronRight, CheckCircle2, ArrowRight, Sparkles, X, DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSEO } from '@/hooks/use-seo';
import QuotationForm from '@/components/ui/quotation-form';
import QuoteCalculator from '@/components/ui/quote-calculator';
import ServicesComparison from '@/components/ui/services-comparison';
import CTASection from '@/components/sections/CTASection';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  techStack?: string[];
  priceRange?: string;
}

const defaultServices: ServiceItem[] = [
  { id: '1', title: 'Web Development', description: 'Custom, responsive websites and web applications built with cutting-edge technologies for optimal user experience and business growth.', icon: 'Globe', features: ['Custom Website Design', 'E-Commerce Solutions', 'CMS Development', 'Progressive Web Apps', 'API Integration'], techStack: ['Next.js', 'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'], priceRange: 'From GHS 5,000' },
  { id: '2', title: 'Mobile App Development', description: 'Native and cross-platform mobile applications that deliver exceptional user experiences on iOS and Android devices.', icon: 'Smartphone', features: ['iOS App Development', 'Android App Development', 'Cross-Platform (React Native)', 'App Store Optimization', 'Push Notifications'], techStack: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase'], priceRange: 'From GHS 8,000' },
  { id: '3', title: 'Skills Training', description: 'Comprehensive IT skills development programs designed to empower individuals and organizations with modern technical expertise.', icon: 'GraduationCap', features: ['Web Development Bootcamps', 'Data Science Training', 'Cloud Computing Courses', 'Cybersecurity Training', 'Corporate Training Programs'], techStack: ['Python', 'JavaScript', 'AWS', 'Azure', 'Docker'], priceRange: 'From GHS 1,500' },
  { id: '4', title: 'SEO & Marketing', description: 'Data-driven digital marketing strategies and search engine optimization to boost online visibility and drive organic growth.', icon: 'TrendingUp', features: ['Search Engine Optimization', 'Pay-Per-Click Advertising', 'Social Media Marketing', 'Content Marketing', 'Email Marketing'], techStack: ['Google Analytics', 'SEMrush', 'Meta Ads', 'Google Ads', 'Mailchimp'], priceRange: 'From GHS 2,000/mo' },
  { id: '5', title: 'Software Development', description: 'Bespoke software solutions tailored to your unique business requirements, from automation tools to enterprise-grade systems.', icon: 'Code', features: ['Custom Software Solutions', 'Enterprise Applications', 'SaaS Development', 'System Integration', 'Process Automation'], techStack: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'AWS'], priceRange: 'From GHS 10,000' },
  { id: '6', title: 'Web Hosting', description: 'Reliable, secure, and high-performance hosting solutions with guaranteed uptime and round-the-clock technical support.', icon: 'Server', features: ['Shared Hosting', 'VPS Hosting', 'Dedicated Servers', 'Cloud Hosting', 'SSL Certificates'], techStack: ['cPanel', 'Nginx', 'CloudLinux', 'LiteSpeed', "Let's Encrypt"], priceRange: 'From GHS 50/yr' },
];

const iconMap: Record<string, React.ElementType> = { Globe, Smartphone, GraduationCap, TrendingUp, Code, Server };

const gradients = [
  'from-emerald-500 to-teal-600',
  'from-teal-500 to-emerald-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-lime-500 to-green-600',
];

export default function ServicesPage() {
  useSEO({
    title: 'Services',
    description: 'Professional IT services in Ghana: Web Development, Mobile App Development, SEO & Marketing, Software Development, IT Training, and Web Hosting.',
    keywords: ['web development Ghana', 'mobile app development', 'SEO services', 'software development', 'IT training Ghana', 'web hosting'],
  });

  const [services, setServices] = useState(defaultServices);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteServiceId, setQuoteServiceId] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    fetcher('/api/services')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((s: Record<string, unknown>) => {
            const defaults = defaultServices.find(d => d.title === s.title);
            return {
              ...s,
              techStack: s.techStack || defaults?.techStack || [],
              priceRange: s.priceRange || defaults?.priceRange || 'Contact us',
            } as ServiceItem;
          });
          setServices(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-[calc(100vh-5rem)] overflow-hidden bg-background flex flex-col">
      {/* ═══ Compact Title Bar ═══ */}
      <div className="shrink-0 px-4 lg:px-8 pt-2 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.2em]">Our Services</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold dark:text-white text-slate-900">
              What We <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Offer</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareOpen(true)}
              className="rounded-full text-xs font-medium border-slate-200 dark:border-white/[0.08] dark:text-white/50 text-slate-500 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/[0.06] hover:bg-slate-100 dark:hover:border-white/[0.15] hover:border-slate-300 px-3 h-8"
            >
              Compare Plans
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalculatorOpen(true)}
              className="rounded-full text-xs font-medium border-slate-200 dark:border-white/[0.08] dark:text-white/50 text-slate-500 hover:text-slate-900 dark:hover:text-white dark:hover:bg-white/[0.06] hover:bg-slate-100 dark:hover:border-white/[0.15] hover:border-slate-300 px-3 h-8"
            >
              Cost Calculator
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Services Grid ═══ */}
      <div className="flex-1 min-h-0 px-4 lg:px-8 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 h-full">
            {services.map((service, index) => {
              const IconComp = iconMap[service.icon] || Globe;
              const gradient = gradients[index % gradients.length];
              const isPopular = index === 1;

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="group relative overflow-hidden rounded-xl dark:bg-white/[0.04] bg-white shadow-sm border border-slate-100 dark:border-white/[0.06] backdrop-blur-sm cursor-pointer transition-all duration-300 dark:hover:bg-white/[0.06] hover:bg-slate-100 dark:hover:border-white/[0.12] hover:border-slate-300 hover:scale-[1.01]"
                  onClick={() => setSelectedService(service)}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-amber-500 text-white text-[8px] font-semibold shadow-md px-1.5 py-0 h-4 gap-0.5">
                        <Sparkles className="size-2.5" /> Popular
                      </Badge>
                    </div>
                  )}

                  <div className="p-4 lg:p-6 flex flex-col h-full">
                    {/* Icon */}
                    <div className={`size-10 lg:size-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-2 lg:mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg shrink-0`}>
                      <IconComp className="size-4 lg:size-5 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xs lg:text-sm font-bold dark:text-white/90 text-slate-800 mb-0.5 lg:mb-1 leading-tight">{service.title}</h3>

                    {/* Description */}
                    <p className="text-xs lg:text-sm dark:text-white/60 text-slate-600 leading-relaxed line-clamp-2 mb-2 lg:mb-3">{service.description}</p>

                    {/* Features */}
                    <div className="space-y-0.5 mb-2 lg:mb-3 flex-1">
                      {service.features.slice(0, 4).map((feature: string) => (
                        <div key={feature} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 lg:size-3.5 text-emerald-400/60 shrink-0" />
                          <span className="text-xs lg:text-sm dark:text-white/70 text-slate-600 leading-tight line-clamp-1">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom: Price + CTA */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                      {service.priceRange && (
                        <span className="text-xs lg:text-sm font-semibold text-amber-600 dark:text-amber-400/80">{service.priceRange}</span>
                      )}
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                        Details <ArrowRight className="size-3" />
                      </div>
                    </div>
                  </div>

                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-emerald-500/[0.04] to-transparent" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Service Detail Dialog ═══ */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] dark:bg-slate-900 bg-white border-slate-200 dark:border-white/[0.08]">
          <AnimatePresence mode="wait">
            {selectedService && (
              <motion.div
                key={selectedService.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative h-32 bg-gradient-to-br from-emerald-600 via-amber-500 to-amber-700 flex items-center justify-center">
                  <div className="absolute inset-0 grid-pattern opacity-20" />
                  <div className="text-center relative z-10">
                    <div className="size-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                      {(() => {
                        const IconComp = iconMap[selectedService.icon] || Globe;
                        return <IconComp className="size-6 text-white" />;
                      })()}
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedService.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[calc(85vh-8rem)] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg dark:text-white text-slate-900">{selectedService.title}</DialogTitle>
                    <DialogDescription className="text-sm dark:text-white/60 text-slate-500 leading-relaxed">{selectedService.description}</DialogDescription>
                  </DialogHeader>

                  <div>
                    <h4 className="text-xs font-semibold dark:text-white text-slate-900 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-amber-400" /> What&apos;s Included
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {selectedService.features?.map((feature: string) => (
                        <div key={feature} className="flex items-center gap-1.5 text-xs dark:text-white/60 text-slate-500">
                          <CheckCircle2 className="size-3 text-amber-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedService.techStack && selectedService.techStack.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold dark:text-white text-slate-900 mb-2">Technology Stack</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedService.techStack.map((tech: string) => (
                          <Badge key={tech} variant="secondary" className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedService.priceRange && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <DollarSign className="size-3.5 text-amber-400" />
                        <span className="text-xs font-semibold dark:text-white text-slate-900">Starting Price</span>
                      </div>
                      <p className="text-base font-bold text-amber-400">{selectedService.priceRange}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => { setSelectedService(null); setQuoteServiceId(selectedService.id); setQuoteOpen(true); }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white flex-1 text-xs shadow-md h-9"
                    >
                      Request a Quote <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedService(null)} className="flex-1 border-slate-200 dark:border-white/[0.06] text-xs h-9">Close</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* ═══ Compare Dialog ═══ */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden max-h-[85vh] dark:bg-slate-900 bg-white border-slate-200 dark:border-white/[0.08]">
          <div className="max-h-[85vh] overflow-y-auto">
            <ServicesComparison />
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Calculator Dialog ═══ */}
      <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] dark:bg-slate-900 bg-white border-slate-200 dark:border-white/[0.08]">
          <div className="max-h-[85vh] overflow-y-auto">
            <QuoteCalculator />
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Quotation Form Modal ═══ */}
      <QuotationForm open={quoteOpen} onOpenChange={setQuoteOpen} preselectedService={quoteServiceId} />
    </div>
  );
}
