'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  {
    feature: 'Starting Price',
    web: 'GHS 5,000',
    mobile: 'GHS 8,000',
    software: 'GHS 10,000',
  },
  {
    feature: 'Typical Timeline',
    web: '2-4 weeks',
    mobile: '4-8 weeks',
    software: '6-12 weeks',
  },
  {
    feature: 'Technologies',
    web: 'React, Next.js, Node.js',
    mobile: 'React Native, Flutter',
    software: 'Python, Django, Docker',
  },
  {
    feature: '24/7 Support',
    tooltip: 'Round-the-clock technical support and maintenance',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'Free Updates',
    tooltip: 'Free bug fixes and minor updates for 12 months',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'Revision Rounds',
    web: '3 rounds',
    mobile: '3 rounds',
    software: '5 rounds',
  },
  {
    feature: 'Source Code',
    tooltip: 'Full source code ownership and documentation',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'Maintenance Plan',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'Custom Design',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'API Integration',
    web: true,
    mobile: true,
    software: true,
  },
  {
    feature: 'Performance Testing',
    web: false,
    mobile: true,
    software: true,
  },
  {
    feature: 'Cloud Deployment',
    web: false,
    mobile: false,
    software: true,
  },
  {
    feature: 'User Training',
    tooltip: 'Training sessions for your team on how to use the solution',
    web: false,
    mobile: false,
    software: true,
  },
  {
    feature: 'SEO Optimization',
    web: true,
    mobile: false,
    software: false,
  },
  {
    feature: 'App Store Submission',
    web: false,
    mobile: true,
    software: false,
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center justify-center">
        <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-400" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center">
        <XCircle className="size-5 text-red-400 dark:text-red-500" />
      </span>
    );
  }
  return <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>;
}

export default function ServicesComparison() {
  return (
    <section className="section-padding bg-white dark:bg-slate-900">
      <div className="container-main">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Compare</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Service <span className="text-emerald-600 dark:text-emerald-400">Comparison</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            See how our top services compare. Choose the solution that fits your needs best.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
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
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Web Development</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 border-b-2 border-emerald-300 dark:border-emerald-700 relative">
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-semibold gap-1 px-2 py-0.5">
                          <Sparkles className="size-2.5" />
                          Most Popular
                        </Badge>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Mobile Apps</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                    </th>
                    <th className="text-center py-4 px-4 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Custom Software</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="group hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
                    >
                      <td className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{row.feature}</span>
                          {row.tooltip && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-slate-400 hover:text-emerald-500 transition-colors" aria-label={`Info about ${row.feature}`}>
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
                      <td className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center">
                        <CellValue value={row.web} />
                      </td>
                      <td className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center bg-emerald-50/30 dark:bg-emerald-900/10">
                        <CellValue value={row.mobile} />
                      </td>
                      <td className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 text-center">
                        <CellValue value={row.software} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Included</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="size-4 text-red-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Not included</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[9px] px-1.5 py-0 gap-0.5">
              <Sparkles className="size-2" />
              Popular
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">Recommended service</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
