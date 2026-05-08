'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LightboxItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
}

interface ImageLightboxProps {
  items: LightboxItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageLightbox({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const item = items[currentIndex];

  const goPrev = useCallback(() => {
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    onNavigate(newIndex);
  }, [currentIndex, items.length, onNavigate]);

  const goNext = useCallback(() => {
    const newIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, goPrev, goNext]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            aria-label="Close lightbox"
          >
            <X className="size-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-sm">
            {currentIndex + 1} of {items.length}
          </div>

          {/* Navigation arrows */}
          <Button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 shadow-lg"
            size="icon"
            variant="ghost"
            aria-label="Previous project"
          >
            <ChevronLeft className="size-6" />
          </Button>

          <Button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 shadow-lg"
            size="icon"
            variant="ghost"
            aria-label="Next project"
          >
            <ChevronRight className="size-6" />
          </Button>

          {/* Content */}
          <motion.div
            key={item.id}
            className="relative z-10 w-full max-w-5xl mx-4 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Image placeholder */}
            <div className="relative w-full aspect-video max-h-[60vh] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800">
              <div className="absolute inset-0 grid-pattern opacity-15" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-white font-bold text-3xl sm:text-4xl opacity-30 block">{item.title}</span>
                </div>
              </div>
              {/* Featured badge */}
              {item.featured && (
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-xs font-bold shadow-lg">
                    Featured
                  </span>
                </div>
              )}
              {/* Category badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Bottom info */}
            <motion.div
              className="w-full mt-4 p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{item.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {item.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
