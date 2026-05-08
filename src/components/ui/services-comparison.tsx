'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, Info, Globe, Smartphone, Code, GraduationCap, TrendingUp, Server, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComparisonRow {
  feature: string;
  tooltip?: string;
  web: string | boolean;
  mobile: string | boolean;
  software: string | boolean;
}

const comparisonData: ComparisonRow[] = [
  { feature: 'Starting Price', web: 'GHS 5,000', mobile: 'GHS 8,000', software: 'GHS 10,000' },
  { feature: 'Typical Timeline', web: '2-4 weeks', mobile: '4-8 weeks', software: '6-12 weeks' },
  { feature: 'Technologies', web: 'React, Next.js, Node.js', mobile: 'React Native, Flutter', software: 'Python, Django, Docker' },
  { feature: '24/7 Support', tooltip: 'Round-the-clock technical support and maintenance', web: true, mobile: true, software: true },
  { feature: 'Free Updates', tooltip: 'Free bug fixes and minor updates for 12 months', web: true, mobile: true, software: true },
  { feature: 'Revision Rounds', web: '3 rounds', mobile: '3 rounds', software: '5 rounds' },
  { feature: 'Source Code', tooltip: 'Full source code ownership and documentation', web: true, mobile: true, software: true },
  { feature: 'Maintenance Plan', web: true, mobile: true, software: true },
  { feature: 'Custom Design', web: true, mobile: true, software: true },
  { feature: 'API Integration', web: true, mobile: true, software: true },
  { feature: 'Performance Testing', web: false, mobile: true, software: true },
  { feature: 'Cloud Deployment', web: false, mobile: false, software: true },
  { feature: 'User Training', tooltip: 'Training sessions for your team on how to use the solution', web: false, mobile: false, software: true },
  { feature: 'SEO Optimization', web: true, mobile: false, software: false },
  { feature: 'App Store Submission', web: false, mobile: true, software: false },
];

const serviceIcons: Record<string, React.ElementType> = {
  web: Globe,
  mobile: Smartphone,
  software: Code,
};

const serviceInfo: Record<string, { label: string; desc: string; popular?: boolean }> = {
  web: { label: 'Web Development', desc: 'Custom websites and web applications' },
  mobile: { label: 'Mobile Apps', desc: 'iOS and Android mobile applications', popular: true },
  software: { label: 'Custom Software', desc: 'Bespoke enterprise solutions' },
};

function CellValue({ value, highlight }: { value: string | boolean; highlight: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className={`inline-flex items-center justify-center ${highlight ? 'scale-110' : ''} transition-transform`}>
        <CheckCircle2 className="size-5 text-amber-500 dark:text-amber-400" />
      </span>
    ) : (
      <span className={`inline-flex items-center justify-center ${highlight ? 'opacity-50' : ''} transition-opacity`}>
        <XCircle className="size-5 text-red-400 dark:text-red-500" />
      </span>
    );
  }
  return <span className={`text-sm font-medium ${highlight ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>{value}</span>;
}

// Mobile stacked card view for a single service
function MobileServiceCard({ serviceKey, data }: { serviceKey: string; data: ComparisonRow[] }) {
  const IconComp = serviceIcons[serviceKey] || Globe;
  const info = serviceInfo[serviceKey];

  const included = data.filter(r => r[serviceKey] === true).length;
  const total = data.filter(r => typeof r[serviceKey] === 'boolean').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-2 overflow-hidden ${info?.popular ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'}`}>
        {/* Header */}
        <div className={`relative p-5 ${info?.popular ? 'bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg flex items-center justify-center ${info?.popular ? 'bg-white/20' : 'bg-white dark:bg-slate-700'}`}>
              <IconComp className={`size-5 ${info?.popular ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-sm ${info?.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{info?.label}</h3>
                {info?.popular && (
                  <Badge className="bg-amber-400 text-amber-900 text-[10px] font-semibold px-1.5 py-0 gap-0.5">
                    <Sparkles className="size-2" />
                    Popular
                  </Badge>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${info?.popular ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>{info?.desc}</p>
            </div>
          </div>
          {info?.popular && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full" />
          )}
        </div>

        {/* Features */}
        <CardContent className="p-4 space-y-2.5">
          {data.map((row) => {
            const value = row[serviceKey];
            const isBoolean = typeof value === 'boolean';
            const isIncluded = value === true;
            return (
              <div key={row.feature} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {row.tooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-slate-400 hover:text-amber-500 transition-colors shrink-0" aria-label={`Info about ${row.feature}`}>
                            <Info className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{row.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{row.feature}</span>
                </div>
                <div className="shrink-0 ml-2">
                  {isBoolean ? (
                    isIncluded ? (
                      <CheckCircle2 className="size-4 text-amber-500 dark:text-amber-400" />
                    ) : (
                      <XCircle className="size-4 text-red-400/60 dark:text-red-500/60" />
                    )
                  ) : (
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Summary */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {included}/{total} features included
            </span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${total > 0 ? (included / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {total > 0 ? Math.round((included / total) * 100) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ServicesComparison() {
  const [viewMode, setViewMode] = useState<'compare' | 'web' | 'mobile' | 'software'>('compare');
  const [mobileView, setMobileView] = useState(true);

  // Determine which rows have differences (for highlighting)
  const differenceRows = useMemo(() => {
    return comparisonData.filter((row) => {
      const values = [row.web, row.mobile, row.software] as (string | boolean)[];
      return new Set(values.map(String)).size > 1;
    }).map(r => r.feature);
  }, []);

  return (
    <section className="section-padding bg-white dark:bg-slate-900">
      <div className="container-main">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Compare</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Service <span className="text-amber-600 dark:text-amber-400">Comparison</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            See how our top services compare. Choose the solution that fits your needs best.
          </p>
        </motion.div>

        {/* Toggle buttons for comparison mode */}
        <div className="flex justify-center mb-8">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="compare" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700 data-[state=active]:shadow-sm">
                All Services
              </TabsTrigger>
              <TabsTrigger value="web" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700 data-[state=active]:shadow-sm">
                <Globe className="size-3 mr-1 hidden sm:inline" />
                Web Dev
              </TabsTrigger>
              <TabsTrigger value="mobile" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700 data-[state=active]:shadow-sm">
                <Smartphone className="size-3 mr-1 hidden sm:inline" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="software" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700 data-[state=active]:shadow-sm">
                <Code className="size-3 mr-1 hidden sm:inline" />
                Software
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop: Table view when comparing all */}
        <AnimatePresence mode="wait">
          {viewMode === 'compare' && !mobileView && (
            <motion.div
              key="table-view"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                <TooltipProvider>
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left py-4 px-4 w-48 border-b-2 border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">Feature</span>
                        </th>
                        <th className="text-center py-4 px-4 border-b-2 border-slate-200 dark:border-slate-700">
                          <div className="flex flex-col items-center gap-1">
                            <Globe className="size-4 text-slate-400 mb-1" />
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Web Development</span>
                          </div>
                        </th>
                        <th className="text-center py-4 px-4 border-b-2 border-amber-300 dark:border-amber-700 relative">
                          <div className="flex flex-col items-center gap-1.5">
                            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-semibold gap-1 px-2 py-0.5">
                              <Sparkles className="size-2.5" />
                              Most Popular
                            </Badge>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Mobile Apps</span>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400" />
                        </th>
                        <th className="text-center py-4 px-4 border-b-2 border-slate-200 dark:border-slate-700">
                          <div className="flex flex-col items-center gap-1">
                            <Code className="size-4 text-slate-400 mb-1" />
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Custom Software</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((row, index) => {
                        const isDiff = differenceRows.includes(row.feature);
                        return (
                          <motion.tr
                            key={row.feature}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
                            className={`group transition-colors ${isDiff ? 'bg-amber-50/40 dark:bg-amber-900/5 hover:bg-amber-50/70 dark:hover:bg-amber-900/10' : 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10'}`}
                          >
                            <td className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                {isDiff && (
                                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                )}
                                <span className="text-sm text-slate-600 dark:text-slate-400">{row.feature}</span>
                                {row.tooltip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-slate-400 hover:text-amber-500 transition-colors" aria-label={`Info about ${row.feature}`}>
                                        <Info className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px]">
                                      <p className="text-xs">{row.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            <td className={`py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center ${isDiff ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                              <CellValue value={row.web} highlight={row.web === true && (row.mobile !== row.web || row.software !== row.web)} />
                            </td>
                            <td className={`py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center bg-amber-50/30 dark:bg-amber-900/10`}>
                              <CellValue value={row.mobile} highlight={row.mobile === true && (row.web !== row.mobile || row.software !== row.mobile)} />
                            </td>
                            <td className={`py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center ${isDiff ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                              <CellValue value={row.software} highlight={row.software === true && (row.web !== row.software || row.mobile !== row.software)} />
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>
            </motion.div>
          )}

          {/* Mobile / focused view: Single service card */}
          {(viewMode !== 'compare' || mobileView) && (
            <motion.div
              key={viewMode === 'compare' ? 'mobile-cards' : `${viewMode}-card`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="lg:hidden space-y-4"
            >
              {viewMode === 'compare' ? (
                // Show all services as stacked cards
                <>
                  <MobileServiceCard serviceKey="web" data={comparisonData} />
                  <MobileServiceCard serviceKey="mobile" data={comparisonData} />
                  <MobileServiceCard serviceKey="software" data={comparisonData} />
                </>
              ) : (
                <MobileServiceCard serviceKey={viewMode} data={comparisonData} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop: Single service detail when toggled */}
        <AnimatePresence mode="wait">
          {viewMode !== 'compare' && !mobileView && (
            <motion.div
              key={`desktop-${viewMode}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="hidden lg:block"
            >
              <div className="max-w-lg mx-auto">
                <MobileServiceCard serviceKey={viewMode} data={comparisonData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-amber-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Included</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="size-4 text-red-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Not included</span>
          </div>
          {viewMode === 'compare' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Varies by service</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] px-1.5 py-0 gap-0.5">
              <Sparkles className="size-2" />
              Popular
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">Recommended service</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Still not sure? Let us help you decide.</p>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-300">
            Get a Free Consultation
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
