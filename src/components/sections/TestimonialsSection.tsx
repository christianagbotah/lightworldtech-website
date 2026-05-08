'use client';

import { useEffect, useState, useCallback } from 'react';
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
  {
    id: '1',
    name: 'John Mokoena',
    company: 'TechVentures SA',
    role: 'CEO',
    rating: 5,
    quote: 'Lightworld Technologies transformed our online presence completely. Their team delivered a stunning website that increased our leads by 300%. Professional, responsive, and truly exceptional.',
  },
  {
    id: '2',
    name: 'Sarah van der Merwe',
    company: 'GreenLeaf Hospitality',
    role: 'Marketing Director',
    rating: 5,
    quote: 'The mobile app they built for us is incredible. Our guests love the seamless booking experience. The team went above and beyond to meet our deadlines.',
  },
  {
    id: '3',
    name: 'David Nkosi',
    company: 'EduPro Academy',
    role: 'Founder',
    rating: 5,
    quote: 'Their skills training program upskilled our entire IT department. The trainers were knowledgeable and the curriculum was perfectly tailored to our needs.',
  },
  {
    id: '4',
    name: 'Lisa Pretorius',
    company: 'Urban Properties',
    role: 'Operations Manager',
    rating: 5,
    quote: 'From concept to launch, the Lightworld team was outstanding. Their SEO strategies doubled our organic traffic within three months. Highly recommended!',
  },
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
          className="text-center max-w-2xl mx-auto mb-12"
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
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Carousel
              opts={{ align: 'start', loop: true }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        <Quote className="size-8 text-emerald-400/40 mb-4" />
                        <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6">
                          &ldquo;{testimonial.quote}&rdquo;
                        </p>
                        {/* Rating */}
                        <div className="flex gap-0.5 mb-4">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        {/* Author */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                          <div className="size-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
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
              <div className="flex items-center justify-center gap-2 mt-8">
                <CarouselPrevious className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" />
                <CarouselNext className="static translate-y-0 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" />
              </div>
            </Carousel>
          </motion.div>
        )}
      </div>
    </section>
  );
}
