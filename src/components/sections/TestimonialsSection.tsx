'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

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

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher('/api/testimonials')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTestimonials(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 dot-pattern opacity-10" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />

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

        {/* Trusted by logos */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-12"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Trusted by</span>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {trustedLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors duration-300"
              >
                <div className="size-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                  {logo.initials}
                </div>
                <span className="text-xs font-medium hidden sm:block">{logo.name}</span>
              </div>
            ))}
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
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Carousel
              opts={{ align: 'start', loop: true }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm h-full relative overflow-hidden group hover:border-emerald-600/50 hover:shadow-lg hover:shadow-emerald-900/20 transition-all duration-500">
                      {/* Top gradient accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardContent className="p-6 flex flex-col h-full relative">
                        {/* Large quote decoration */}
                        <Quote className="size-32 text-emerald-500/[0.04] absolute -top-4 -right-4 group-hover:text-emerald-500/[0.08] transition-all duration-700" />
                        <Quote className="size-8 text-emerald-400/60 mb-4 relative" />
                        <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6 relative">
                          &ldquo;{testimonial.content || (testimonial as Record<string, unknown>).quote}&rdquo;
                        </p>
                        {/* Star rating with enhanced glow */}
                        <div className="flex gap-1 mb-4 relative">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="size-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                          ))}
                        </div>
                        {/* Author */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50 relative">
                          <div className="size-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow duration-300">
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
              <div className="flex items-center justify-center gap-3 mt-8">
                <CarouselPrevious className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-colors duration-300 size-10 rounded-full">
                  <ChevronLeft className="size-4" />
                </CarouselPrevious>
                <div className="flex gap-1.5">
                  {testimonials.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-600 transition-colors" />
                  ))}
                </div>
                <CarouselNext className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-colors duration-300 size-10 rounded-full">
                  <ChevronRight className="size-4" />
                </CarouselNext>
              </div>
            </Carousel>
          </motion.div>
        )}
      </div>
    </section>
  );
}
