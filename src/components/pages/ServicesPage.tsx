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
import { useAppStore } from '@/lib/store';
import { useSEO } from '@/hooks/use-seo';
import CTASection from '@/components/sections/CTASection';
import QuotationForm from '@/components/ui/quotation-form';
import QuoteCalculator from '@/components/ui/quote-calculator';
import ServicesComparison from '@/components/ui/services-comparison';
import { useTilt } from '@/hooks/use-tilt';

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
  {
    id: '1', title: 'Web Development',
    description: 'Custom, responsive websites and web applications built with cutting-edge technologies for optimal user experience and business growth.',
    icon: 'Globe',
    features: ['Custom Website Design', 'E-Commerce Solutions', 'CMS Development', 'Progressive Web Apps', 'API Integration'],
    techStack: ['Next.js', 'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    priceRange: 'From GHS 5,000',
  },
  {
    id: '2', title: 'Mobile App Development',
    description: 'Native and cross-platform mobile applications that deliver exceptional user experiences on iOS and Android devices.',
    icon: 'Smartphone',
    features: ['iOS App Development', 'Android App Development', 'Cross-Platform (React Native)', 'App Store Optimization', 'Push Notifications'],
    techStack: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase'],
    priceRange: 'From GHS 8,000',
  },
  {
    id: '3', title: 'Skills Training',
    description: 'Comprehensive IT skills development programs designed to empower individuals and organizations with modern technical expertise.',
    icon: 'GraduationCap',
    features: ['Web Development Bootcamps', 'Data Science Training', 'Cloud Computing Courses', 'Cybersecurity Training', 'Corporate Training Programs'],
    techStack: ['Python', 'JavaScript', 'AWS', 'Azure', 'Docker'],
    priceRange: 'From GHS 1,500',
  },
  {
    id: '4', title: 'SEO & Marketing',
    description: 'Data-driven digital marketing strategies and search engine optimization to boost online visibility and drive organic growth.',
    icon: 'TrendingUp',
    features: ['Search Engine Optimization', 'Pay-Per-Click Advertising', 'Social Media Marketing', 'Content Marketing', 'Email Marketing'],
    techStack: ['Google Analytics', 'SEMrush', 'Meta Ads', 'Google Ads', 'Mailchimp'],
    priceRange: 'From GHS 2,000/mo',
  },
  {
    id: '5', title: 'Software Development',
    description: 'Bespoke software solutions tailored to your unique business requirements, from automation tools to enterprise-grade systems.',
    icon: 'Code',
    features: ['Custom Software Solutions', 'Enterprise Applications', 'SaaS Development', 'System Integration', 'Process Automation'],
    techStack: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'AWS'],
    priceRange: 'From GHS 10,000',
  },
  {
    id: '6', title: 'Web Hosting',
    description: 'Reliable, secure, and high-performance hosting solutions with guaranteed uptime and round-the-clock technical support.',
    icon: 'Server',
    features: ['Shared Hosting', 'VPS Hosting', 'Dedicated Servers', 'Cloud Hosting', 'SSL Certificates'],
    techStack: ['cPanel', 'Nginx', 'CloudLinux', 'LiteSpeed', 'Let\'s Encrypt'],
    priceRange: 'From GHS 50/yr',
  },
];

const iconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, GraduationCap, TrendingUp, Code, Server,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function ServiceCard({
  service,
  index,
  expandedId,
  setExpandedId,
  setSelectedService,
  setQuoteServiceId,
  setQuoteOpen,
}: {
  service: ServiceItem;
  index: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  setSelectedService: (s: ServiceItem) => void;
  setQuoteServiceId: (id: string) => void;
  setQuoteOpen: (open: boolean) => void;
}) {
  const IconComp = iconMap[service.icon] || Globe;
  const isExpanded = expandedId === service.id;
  const isPopular = index === 1;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    el.style.transition = 'transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)';

    const highlight = el.querySelector('[data-tilt-highlight]') as HTMLElement;
    if (highlight) {
      highlight.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, oklch(0.765 0.177 163.223 / 0.12), transparent 60%)`;
      highlight.style.opacity = '1';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    el.style.transition = 'transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)';
    const highlight = el.querySelector('[data-tilt-highlight]') as HTMLElement;
    if (highlight) {
      highlight.style.opacity = '0';
    }
  }, []);

  return (
    <Card
      ref={cardRef}
      className={`h-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl dark:hover:shadow-amber-900/20 transition-shadow duration-300 group relative overflow-hidden cursor-pointer ${isPopular ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200/50 dark:ring-emerald-500/50' : ''} ${isExpanded ? 'border-amber-300 dark:border-amber-600 shadow-md ring-1 ring-amber-200 dark:ring-emerald-500' : ''}`}
      onClick={() => setSelectedService(service)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tilt gradient highlight */}
      <div
        data-tilt-highlight
        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none z-10"
      />
      {/* Gradient top border */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-400 transition-transform duration-500 origin-left z-20 ${isPopular ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
      {/* Most Popular badge */}
      {isPopular && (
        <div className="absolute top-3 right-3 z-20">
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold shadow-md gap-1">
            <Sparkles className="size-3" />
            Most Popular
          </Badge>
        </div>
      )}
      <CardContent className="p-6 relative z-[5]">
        <div className="size-14 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/50 flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow duration-300">
          <IconComp className="size-6 text-emerald-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-amber-400 transition-colors">{service.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{service.description}</p>

        {/* Features list */}
        {service.features && (
          <div className="space-y-2">
            <ul className="space-y-2">
              {service.features.slice(0, isExpanded ? undefined : 3).map((feature: string) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="size-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {service.features.length > 3 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : service.id); }}
                className="text-xs font-medium text-emerald-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors inline-flex items-center gap-1"
              >
                {isExpanded ? 'Show less' : `+${service.features.length - 3} more features`}
                <ArrowRight className={`size-3 transition-transform duration-200 ${isExpanded ? '-rotate-90' : ''}`} />
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            onClick={(e) => { e.stopPropagation(); setQuoteServiceId(service.id); setQuoteOpen(true); }}
            className={`flex-1 transition-all duration-300 ${isPopular ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-md hover:shadow-lg' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} group/btn`}
          >
            Get a Quote <ArrowRight className="size-4 ml-1 group-hover/btn:translate-x-1 transition-transform duration-200" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setSelectedService(service); }}
            className="border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-amber-400 shrink-0"
            aria-label={`View details for ${service.title}`}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServicesPage() {
  const { navigate } = useAppStore();
  useSEO({
    title: 'Services',
    description: 'Professional IT services in Ghana: Web Development, Mobile App Development, SEO & Marketing, Software Development, IT Training, and Web Hosting. Get a free quote today.',
    keywords: ['web development Ghana', 'mobile app development', 'SEO services', 'software development', 'IT training Ghana', 'web hosting', 'digital marketing Accra'],
  });
  const [services, setServices] = useState(defaultServices);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteServiceId, setQuoteServiceId] = useState<string>('');

  useEffect(() => {
    fetcher('/api/services')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge API data with default tech stacks and pricing
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
    <main>
      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container-main relative z-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button onClick={() => navigate('home')} className="hover:text-amber-400 transition-colors">Home</button>
            <ChevronRight className="size-3" />
            <span className="text-amber-400">Services</span>
          </nav>
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Our <span className="text-amber-400">Services</span>
          </motion.h1>
          <motion.p
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Comprehensive IT solutions designed to accelerate your business growth and digital transformation.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-white dark:bg-slate-900">
        <div className="container-main">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white dark:bg-slate-800">
                  <div className="p-6">
                    <Skeleton className="size-12 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {services.map((service, index) => {
                return (
                  <motion.div key={service.id} variants={itemVariants}>
                    <ServiceCard
                      service={service}
                      index={index}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      setSelectedService={setSelectedService}
                      setQuoteServiceId={setQuoteServiceId}
                      setQuoteOpen={setQuoteOpen}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Service Detail Modal */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
          <AnimatePresence mode="wait">
            {selectedService && (
              <motion.div
                key={selectedService.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Gradient Header */}
                <div className="relative h-36 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 dark:from-amber-600 dark:via-amber-500 dark:to-amber-900 flex items-center justify-center">
                  <div className="absolute inset-0 grid-pattern opacity-20" />
                  <div className="text-center relative z-10">
                    <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                      {(() => {
                        const IconComp = iconMap[selectedService.icon] || Globe;
                        return <IconComp className="size-7 text-white" />;
                      })()}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{selectedService.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="absolute top-3 right-3 size-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors z-10"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-6 space-y-5 max-h-[calc(90vh-9rem)] overflow-y-auto">
                  {/* Description */}
                  <DialogHeader>
                    <DialogTitle className="text-xl">{selectedService.title}</DialogTitle>
                    <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedService.description}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-amber-500" />
                      What&apos;s Included
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedService.features?.map((feature: string) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="size-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technology Stack */}
                  {selectedService.techStack && selectedService.techStack.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Technology Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedService.techStack.map((tech: string) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  {selectedService.priceRange && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="size-4 text-emerald-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Starting Price</span>
                      </div>
                      <p className="text-lg font-bold text-amber-500 dark:text-amber-300">{selectedService.priceRange}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Custom quotes available for complex projects</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => { setSelectedService(null); setQuoteServiceId(selectedService.id); setQuoteOpen(true); }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-md"
                    >
                      Request a Quote
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedService(null)}
                      className="flex-1 border-slate-200 dark:border-slate-600"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Quote Calculator */}
      <QuoteCalculator />

      {/* Services Comparison Table */}
      <ServicesComparison />

      {/* Development Process */}
      <section className="section-padding bg-slate-50 dark:bg-slate-800/50">
        <div className="container-main">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">Process</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">How We Deliver Excellence</h2>
            <p className="text-slate-600 dark:text-slate-300">Our proven methodology ensures consistent, high-quality results for every project.</p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {[
              { step: '01', title: 'Discovery', desc: 'Understanding your goals and requirements' },
              { step: '02', title: 'Strategy', desc: 'Planning the optimal approach' },
              { step: '03', title: 'Development', desc: 'Building with precision and expertise' },
              { step: '04', title: 'Delivery', desc: 'Testing, launching, and supporting' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative text-center p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-4xl font-bold text-amber-200 dark:text-amber-800 mb-2">{item.step}</div>
                <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />

      {/* Quotation Form Modal */}
      <QuotationForm open={quoteOpen} onOpenChange={setQuoteOpen} preselectedService={quoteServiceId} />
    </main>
  );
}
