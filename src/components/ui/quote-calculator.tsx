'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, ChevronDown, ArrowRight, Sparkles, Check, Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

interface ServiceOption {
  id: string;
  label: string;
  basePrice: number;
}

const services: ServiceOption[] = [
  { id: 'web-dev', label: 'Web Development', basePrice: 5000 },
  { id: 'mobile-app', label: 'Mobile App Development', basePrice: 8000 },
  { id: 'software', label: 'Software Development', basePrice: 10000 },
  { id: 'seo', label: 'SEO & Digital Marketing', basePrice: 2000 },
  { id: 'training', label: 'IT Skills Training', basePrice: 1500 },
  { id: 'hosting', label: 'Web Hosting & Maintenance', basePrice: 600 },
];

const complexityOptions = [
  { id: 'simple', label: 'Simple', multiplier: 1, description: 'Basic functionality, minimal pages/features' },
  { id: 'medium', label: 'Medium', multiplier: 2, description: 'Standard features, moderate complexity' },
  { id: 'complex', label: 'Complex', multiplier: 3.5, description: 'Advanced features, integrations, custom logic' },
];

const featureOptions = [
  { id: 'user-auth', label: 'User Authentication', addPrice: 1500 },
  { id: 'payment', label: 'Payment Integration', addPrice: 2000 },
  { id: 'admin-panel', label: 'Admin Dashboard', addPrice: 2500 },
  { id: 'api-integration', label: 'Third-Party API', addPrice: 1800 },
  { id: 'real-time', label: 'Real-time Features', addPrice: 2200 },
  { id: 'analytics', label: 'Analytics & Reports', addPrice: 1200 },
  { id: 'multilingual', label: 'Multi-language Support', addPrice: 1000 },
  { id: 'push-notif', label: 'Push Notifications', addPrice: 800 },
  { id: 'cloud-deploy', label: 'Cloud Deployment', addPrice: 900 },
  { id: 'testing', label: 'Testing & QA', addPrice: 1500 },
];

function AnimatedPrice({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const diff = value - start;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums">
      GHS {displayValue.toLocaleString()}
    </span>
  );
}

export default function QuoteCalculator() {
  const { navigate, setContactSubject } = useAppStore();
  const [selectedService, setSelectedService] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState('medium');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const toggleFeature = useCallback((featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  }, []);

  const priceEstimate = useMemo(() => {
    const service = services.find(s => s.id === selectedService);
    if (!service) return { min: 0, max: 0 };

    const complexity = complexityOptions.find(c => c.id === selectedComplexity) || complexityOptions[1];
    const base = service.basePrice * complexity.multiplier;

    const featuresTotal = selectedFeatures.reduce((sum, fId) => {
      const feature = featureOptions.find(f => f.id === fId);
      return sum + (feature?.addPrice || 0);
    }, 0);

    const min = Math.round(base + featuresTotal);
    const max = Math.round(min * 1.3);

    return { min, max };
  }, [selectedService, selectedComplexity, selectedFeatures]);

  const selectedServiceLabel = services.find(s => s.id === selectedService)?.label || '';
  const selectedComplexityData = complexityOptions.find(c => c.id === selectedComplexity);

  const handleGetQuote = () => {
    const subject = `Quote Request: ${selectedServiceLabel} - ${selectedComplexityData?.label || 'Medium'} Complexity`;
    setContactSubject(subject);
    navigate('contact');
  };

  return (
    <section className="section-padding bg-white dark:bg-slate-900">
      <div className="container-main">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm mb-4 px-4 py-1 font-medium">
            <Calculator className="size-4 mr-1.5" />
            Instant Estimate
          </Badge>
          <h2 className="text-3xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Project Quote Calculator
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Get an instant price estimate for your project. Select your requirements and see the estimated cost range.
          </p>
        </motion.div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Left: Configuration */}
              <div className="lg:col-span-2 p-6 sm:p-8 space-y-6">
                {/* Service Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Service Type
                  </Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-400 dark:focus-visible:border-amber-600">
                      <SelectValue placeholder="Select a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label} — from GHS {s.basePrice.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Complexity Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Project Complexity
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {complexityOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedComplexity(opt.id)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 group ${
                          selectedComplexity === opt.id
                            ? 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-md shadow-amber-500/10'
                            : 'border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        {selectedComplexity === opt.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="size-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        <div className={`font-semibold text-sm mb-1 ${selectedComplexity === opt.id ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {opt.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {opt.description}
                        </div>
                        <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {opt.multiplier}x base price
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Additional Features
                    </Label>
                    <span className="text-xs text-slate-400">
                      {selectedFeatures.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {featureOptions.map((feature) => (
                      <label
                        key={feature.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedFeatures.includes(feature.id)
                            ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <Checkbox
                          checked={selectedFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                          className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700 dark:text-slate-200">{feature.label}</span>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          +GHS {feature.addPrice.toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Breakdown Toggle */}
                {selectedService && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  >
                    <Info className="size-3.5" />
                    {showDetails ? 'Hide' : 'Show'} price breakdown
                    <ChevronDown className={`size-3.5 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {/* Price Breakdown */}
                <AnimatePresence>
                  {showDetails && selectedService && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Base ({selectedServiceLabel})</span>
                          <span>GHS {services.find(s => s.id === selectedService)?.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Complexity ({selectedComplexityData?.label} - {selectedComplexityData?.multiplier}x)</span>
                          <span>×{selectedComplexityData?.multiplier}</span>
                        </div>
                        {selectedFeatures.map(fId => {
                          const f = featureOptions.find(feat => feat.id === fId);
                          return f ? (
                            <div key={fId} className="flex justify-between text-slate-500 dark:text-slate-400">
                              <span>+ {f.label}</span>
                              <span>GHS {f.addPrice.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })}
                        <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between font-semibold text-slate-900 dark:text-white">
                          <span>Estimated Total</span>
                          <span>GHS {priceEstimate.min.toLocaleString()} – {priceEstimate.max.toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right: Price Display */}
              <div className="relative bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-700 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 grid-pattern opacity-10" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-300/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <Sparkles className="size-8 text-amber-300 mx-auto mb-4" />
                  <p className="text-amber-200 text-sm font-medium mb-1">Estimated Price Range</p>

                  {selectedService ? (
                    <>
                      <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                        <AnimatedPrice value={priceEstimate.min} />
                      </div>
                      <p className="text-amber-200/80 text-sm mb-4">
                        to <AnimatedPrice value={priceEstimate.max} />
                      </p>
                      <p className="text-amber-200/60 text-xs mb-6 max-w-[200px] mx-auto">
                        Final price may vary based on detailed requirements
                      </p>
                      <Button
                        onClick={handleGetQuote}
                        className="w-full bg-white text-amber-700 hover:bg-amber-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                      >
                        Get Detailed Quote
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl sm:text-3xl font-bold text-white/60 mb-2">
                        GHS 0
                      </div>
                      <p className="text-amber-200/60 text-sm mb-4">
                        Select a service to see the estimate
                      </p>
                      <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                        <p className="text-amber-100 text-xs leading-relaxed">
                          Prices are estimates based on Ghana market rates. Contact us for a detailed, custom quote.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
