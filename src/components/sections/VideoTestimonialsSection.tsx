'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Quote, Star, ChevronLeft, ChevronRight, X, ThumbsUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface VideoTestimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  initials: string;
  gradient: string;
  rating: number;
  duration: string;
}

const videoTestimonials: VideoTestimonial[] = [
  {
    id: '1',
    name: 'Rev. Samuel Owusu',
    role: 'Senior Pastor',
    company: 'Grace Tabernacle Church',
    quote: 'Lightworld Technologies transformed our online presence completely. Their team delivered a stunning website with live streaming and donation integration. The professionalism and attention to detail were exceptional. I recommend them to any organization looking for top-quality IT solutions in Ghana.',
    initials: 'SO',
    gradient: 'from-amber-500 to-yellow-600',
    rating: 5,
    duration: '2:30',
  },
  {
    id: '2',
    name: 'Beatrice Ofori',
    role: 'Director',
    company: 'EduPrime Academy',
    quote: 'The school management system they built has streamlined our operations significantly. From enrollment to grades, everything is now automated and efficient. The team understood our unique needs as an educational institution and delivered beyond our expectations.',
    initials: 'BO',
    gradient: 'from-amber-500 to-orange-600',
    rating: 5,
    duration: '3:15',
  },
  {
    id: '3',
    name: 'Kwabena Danso',
    role: 'Owner',
    company: 'FreshBite Restaurant',
    quote: 'Our e-commerce food ordering platform is amazing! Customers can order and pay online seamlessly. Our revenue has increased by 40% since launching. Lightworld Technologies truly understands how technology can transform business operations.',
    initials: 'KD',
    gradient: 'from-amber-500 to-amber-700',
    rating: 5,
    duration: '1:45',
  },
];

export default function VideoTestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoTestimonial | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videoTestimonials.length);
    }, 6000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    startAutoPlay();
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + videoTestimonials.length) % videoTestimonials.length);
    startAutoPlay();
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % videoTestimonials.length);
    startAutoPlay();
  };

  const openVideoModal = (testimonial: VideoTestimonial) => {
    setSelectedVideo(testimonial);
    setIsPlaying(true);
  };

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-800/50 relative overflow-hidden">
      {/* Decorative mesh background */}
      <div className="absolute inset-0 mesh-pattern opacity-30 dark:opacity-15" />

      {/* Floating orbs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl animate-breathe" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '-3s' }} />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Video Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">
            Hear It From Our <span className="text-gradient-amber">Clients</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Watch what our satisfied clients have to say about their experience working with Lightworld Technologies.
          </p>
        </motion.div>

        {/* Video Cards Carousel */}
        <div className="relative max-w-5xl mx-auto">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {videoTestimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={index === activeIndex ? 'md:scale-105 md:z-10' : ''}
                  >
                    <Card
                      className="overflow-hidden border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm cursor-pointer hover:shadow-xl dark:hover:shadow-amber-900/20 transition-all duration-500 group h-full shimmer-sweep"
                      onClick={() => openVideoModal(testimonial)}
                    >
                      {/* Video placeholder with gradient */}
                      <div className={`relative h-48 bg-gradient-to-br ${testimonial.gradient} overflow-hidden`}>
                        <div className="absolute inset-0 grid-pattern opacity-20" />
                        {/* Decorative large initials */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                          <div className="size-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold text-white">
                            {testimonial.initials}
                          </div>
                        </div>
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="size-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40 group-hover:bg-white/30 group-hover:border-white/60 group-hover:shadow-lg group-hover:shadow-white/10 transition-all duration-300"
                          >
                            <Play className="size-7 text-white ml-1" />
                          </motion.div>
                        </div>
                        {/* Duration badge */}
                        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="size-3" />
                          {testimonial.duration}
                        </div>
                        {/* Active indicator */}
                        {index === activeIndex && (
                          <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-amber-500/20">
                            <span className="size-1.5 rounded-full bg-white animate-pulse" />
                            Featured
                          </div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        {/* Stars with glow */}
                        <div className="flex gap-0.5 mb-3">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="size-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                          ))}
                        </div>
                        {/* Quote */}
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-3 relative">
                          <Quote className="size-4 text-amber-300 dark:text-amber-700 absolute -top-0.5 -left-0.5 opacity-50" />
                          <span className="pl-5">&ldquo;{testimonial.quote}&rdquo;</span>
                        </p>
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/80">
                          <div className={`size-9 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                            {testimonial.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{testimonial.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{testimonial.role}, {testimonial.company}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={goPrev}
              className="size-10 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm hover:shadow-md"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex gap-2">
              {videoTestimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-8 h-2.5 bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm'
                      : 'w-2.5 h-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="size-10 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm hover:shadow-md"
              aria-label="Next testimonial"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => { setSelectedVideo(null); setIsPlaying(false); }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          {selectedVideo && (
            <motion.div
              key={selectedVideo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Video Player Placeholder */}
              <div className={`relative h-56 sm:h-72 bg-gradient-to-br ${selectedVideo.gradient}`}>
                <div className="absolute inset-0 grid-pattern opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {isPlaying ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <div className="size-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40 mx-auto mb-4 shadow-xl">
                        <div className="size-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                      <p className="text-white/90 text-sm font-medium">Video loading...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="size-20 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center border-2 border-white/50 cursor-pointer shadow-xl"
                      onClick={() => setIsPlaying(true)}
                    >
                      <Play className="size-9 text-white ml-1" />
                    </motion.div>
                  )}
                </div>
                {/* Close button */}
                <button
                  onClick={() => { setSelectedVideo(null); setIsPlaying(false); }}
                  className="absolute top-3 right-3 size-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
                  aria-label="Close video"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Testimonial details */}
              <div className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: selectedVideo.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400 drop-shadow-sm" />
                  ))}
                </div>
                <div className="flex items-start gap-3 mb-5 relative">
                  <div className="absolute top-0 left-0 opacity-10 pointer-events-none">
                    <Quote className="size-16 text-amber-500" />
                  </div>
                  <Quote className="size-8 text-amber-300 dark:text-amber-700 shrink-0 mt-1 relative" />
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic relative">
                    &ldquo;{selectedVideo.quote}&rdquo;
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`size-11 rounded-full bg-gradient-to-br ${selectedVideo.gradient} flex items-center justify-center text-white font-bold shadow-md`}>
                      {selectedVideo.initials}
                    </div>
                    <div>
                      <DialogHeader>
                        <DialogTitle className="text-base">{selectedVideo.name}</DialogTitle>
                        <DialogDescription>
                          {selectedVideo.role}, {selectedVideo.company}
                        </DialogDescription>
                      </DialogHeader>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <ThumbsUp className="size-4" />
                    <span className="text-xs">Helpful</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
