'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, Users, Award, MessageSquarePlus, CheckCircle2, Send, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { z } from 'zod';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultTestimonials = [
  { id: '1', name: 'Rev. Samuel Owusu', company: 'Grace Tabernacle Church', role: 'Senior Pastor', rating: 5, content: 'Lightworld Technologies transformed our online presence completely. Their team delivered a stunning website with live streaming and donation integration. Professional and exceptional.' },
  { id: '2', name: 'Beatrice Ofori', company: 'EduPrime Academy', role: 'Director', rating: 5, content: 'The school management system they built has streamlined our operations significantly. From enrollment to grades, everything is now automated and efficient. Highly recommended!' },
  { id: '3', name: 'Kwabena Danso', company: 'FreshBite Restaurant', role: 'Owner', rating: 5, content: 'Our e-commerce food ordering platform is amazing! Customers can order and pay online. Our revenue has increased by 40% since launching.' },
  { id: '4', name: 'Ama Boateng', company: 'Premier Hotels', role: 'General Manager', rating: 5, content: 'The booking system developed by Lightworld is seamless. Guests can book rooms and make payments online. Excellent service and support!' },
];

const trustedLogos = [
  { name: 'TechGhana', initials: 'TG' },
  { name: 'Accra Digital', initials: 'AD' },
  { name: 'AfricanBiz', initials: 'AB' },
  { name: 'DataFlow', initials: 'DF' },
  { name: 'GreenTech', initials: 'GT' },
  { name: 'MediConnect', initials: 'MC' },
];

const reviewSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  role: z.string().optional(),
  rating: z.number().min(1, 'Please select a rating').max(5),
  content: z.string().min(20, 'Review must be at least 20 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

function ClientsCounter() {
  const { displayValue, ref } = useAnimatedCounter({ end: 150, suffix: '+', startOnView: false });
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-extrabold text-white tabular-nums">{displayValue}</div>
      <div className="text-sm text-slate-400 mt-1">Clients Served</div>
    </div>
  );
}

function ReviewFormModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState<ReviewFormData>({
    name: '',
    company: '',
    role: '',
    rating: 0,
    content: '',
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateField = (field: keyof ReviewFormData, value: unknown) => {
    try {
      const partial = reviewSchema.shape[field];
      partial.parse(value);
      setErrors(prev => ({ ...prev, [field]: undefined }));
      return true;
    } catch {
      setErrors(prev => ({ ...prev, [field]: 'Invalid value' }));
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      const result = reviewSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof ReviewFormData, string>> = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ReviewFormData;
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      setSubmitting(true);
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        toast.success('Thank you for your review! Your feedback is invaluable to us.');
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFormData({ name: '', company: '', role: '', rating: 0, content: '' });
      setErrors({});
      setSubmitted(false);
      setHoverRating(0);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
                className="size-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="size-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Thank You!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Your review has been submitted successfully. We appreciate your feedback and will publish it after review.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    <MessageSquarePlus className="size-5" />
                    Share Your Experience
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-sm">
                    Tell us about your experience working with Lightworld Technologies.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="review-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="review-name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (errors.name) validateField('name', e.target.value);
                    }}
                    onBlur={() => validateField('name', formData.name)}
                    className={errors.name ? 'border-red-400 dark:border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Company & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="review-company" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Company
                    </Label>
                    <Input
                      id="review-company"
                      placeholder="Your company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Role
                    </Label>
                    <Input
                      id="review-role"
                      placeholder="Your role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Star Rating */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Rating <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, rating: star }));
                          if (errors.rating) validateField('rating', star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`size-7 transition-colors duration-150 ${
                            star <= (hoverRating || formData.rating)
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    {(formData.rating > 0 || hoverRating > 0) && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                        {hoverRating || formData.rating}/5
                      </span>
                    )}
                  </div>
                  {errors.rating && <p className="text-xs text-red-500">{errors.rating}</p>}
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <Label htmlFor="review-content" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Your Review <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="review-content"
                    placeholder="Tell us about your experience (minimum 20 characters)..."
                    value={formData.content}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, content: e.target.value }));
                      if (errors.content) validateField('content', e.target.value);
                    }}
                    onBlur={() => validateField('content', formData.content)}
                    rows={4}
                    className={errors.content ? 'border-red-400 dark:border-red-500' : ''}
                  />
                  <div className="flex justify-between items-center">
                    {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
                    <p className="text-xs text-slate-400 ml-auto">{formData.content.length} characters</p>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {submitting ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default function TestimonialsSection() {
  const { navigate } = useAppStore();
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const [loading, setLoading] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselApiRef = useRef<CarouselApi | null>(null);

  useEffect(() => {
    fetcher('/api/testimonials')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTestimonials(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sync active dot with carousel scroll position
  const syncActiveDot = useCallback(() => {
    const api = carouselApiRef.current;
    if (!api) return;
    const scrollProgress = api.scrollProgress();
    const newIndex = Math.round(scrollProgress * testimonials.length) % testimonials.length;
    setActiveDot(newIndex < 0 ? 0 : newIndex);
  }, [testimonials.length]);

  // Hook into the carousel API
  const handleApi = useCallback((api: CarouselApi) => {
    if (!api) return;
    carouselApiRef.current = api;
    api.on('select', syncActiveDot);
    api.on('scroll', syncActiveDot);
  }, [syncActiveDot]);

  // Auto-play carousel with pause-on-hover support
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (!isPaused) {
        const api = carouselApiRef.current;
        if (api) api.scrollNext();
      }
    }, 5000);
  }, [isPaused]);

  useEffect(() => {
    if (!loading) startAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [loading, startAutoPlay]);

  const handlePrev = () => {
    carouselApiRef.current?.scrollPrev();
    startAutoPlay();
  };

  const handleNext = () => {
    carouselApiRef.current?.scrollNext();
    startAutoPlay();
  };

  const handleDotClick = (index: number) => {
    carouselApiRef.current?.scrollTo(index);
    setActiveDot(index);
    startAutoPlay();
  };

  // Keyboard navigation for carousel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  }, [handlePrev, handleNext]);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  return (
    <section className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Parallax-like slow-moving gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-amber-950/30 animate-[gradient-shift_20s_ease-in-out_infinite] bg-[length:200%_200%]" />
      </div>
      {/* Decorative elements */}
      <div className="absolute inset-0 dot-pattern opacity-10" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-white">What Our Clients Say</h2>
          <p className="text-slate-400">
            Don&apos;t just take our word for it — hear from the businesses we&apos;ve helped transform.
          </p>
        </motion.div>

        {/* Clients served counter */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-emerald-600/20 to-amber-600/20 rounded-2xl px-8 py-4 border border-emerald-500/20 backdrop-blur-sm">
            <div className="size-12 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Users className="size-6 text-white" />
            </div>
            <div className="text-left">
              <ClientsCounter />
              <div className="flex items-center gap-1 mt-0.5">
                <Award className="size-3 text-amber-400" />
                <span className="text-xs text-amber-400/80 font-medium">Trusted across Africa</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Testimonials carousel */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 p-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Carousel
              opts={{ align: 'start', loop: true }}
              className="w-full"
              setApi={handleApi}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-label="Client testimonials carousel - use arrow keys to navigate"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                    <Card className="bg-slate-800/40 border-slate-700/40 backdrop-blur-md h-full relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-900/30 transition-all duration-500">
                      {/* Top gradient accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardContent className="p-6 flex flex-col h-full relative">
                        {/* Large quote decoration with gradient */}
                        <div className="absolute -top-2 -right-2 size-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-amber-500/10 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                          <Quote className="size-10 text-emerald-400/30 group-hover:text-emerald-400/50 transition-colors duration-500" />
                        </div>
                        <Quote className="size-8 text-emerald-400/60 mb-4 relative" />
                        <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6 relative">
                          &ldquo;{testimonial.content || (testimonial as Record<string, unknown>).quote}&rdquo;
                        </p>
                        {/* Star rating with enhanced glow */}
                        <div className="flex gap-1 mb-4 relative">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, rotate: -180 }}
                              whileInView={{ scale: 1, rotate: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: i * 0.1, type: 'spring' }}
                            >
                              <Star className="size-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                            </motion.div>
                          ))}
                        </div>
                        {/* Author */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-700/40 relative">
                          <div className="size-11 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow duration-300">
                            {testimonial.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-white">{testimonial.name}</div>
                            <div className="text-xs text-slate-400">{testimonial.role}, {testimonial.company}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation Controls */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  size="icon"
                  className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-colors duration-300 size-10 rounded-full"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex gap-2" role="tablist" aria-label="Testimonial navigation">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleDotClick(i)}
                      aria-label={`Go to testimonial ${i + 1}`}
                      aria-selected={i === activeDot}
                      role="tab"
                      className={`rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        i === activeDot
                          ? 'w-6 h-2 bg-gradient-to-r from-emerald-400 to-amber-400'
                          : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  onClick={handleNext}
                  variant="outline"
                  size="icon"
                  className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-colors duration-300 size-10 rounded-full"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Pause/Play button and auto-play indicator */}
              <div className="flex justify-center mt-3">
                <button
                  onClick={togglePause}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                >
                  {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                  <span>{isPaused ? 'Paused' : 'Auto-playing'}</span>
                  {!isPaused && (
                    <span className="relative flex size-1.5 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                    </span>
                  )}
                </button>
              </div>
            </Carousel>
          </motion.div>
        )}

        {/* Trusted by Leading Companies strip */}
        <motion.div
          className="mt-12 pt-8 border-t border-slate-700/40"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-center text-xs uppercase tracking-wider text-slate-500 font-medium mb-5">Trusted by Leading Companies</p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {trustedLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="size-9 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-600/40 flex items-center justify-center text-[10px] font-bold text-emerald-400 transition-colors duration-300">
                  {logo.initials}
                </div>
                <span className="text-xs font-medium hidden sm:block">{logo.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Button
            onClick={() => setReviewOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6"
          >
            <MessageSquarePlus className="size-4 mr-2" />
            Share Your Experience
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('home')}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-300 px-6"
          >
            Read More Reviews
          </Button>
        </motion.div>
      </div>

      {/* Review Form Modal */}
      <ReviewFormModal open={reviewOpen} onOpenChange={setReviewOpen} />
    </section>
  );
}
