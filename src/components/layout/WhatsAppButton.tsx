'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Clock, Shield, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const whatsappNumber = '233243618186';
const whatsappMessage = encodeURIComponent('Hello Lightworld Technologies! I would like to inquire about your services.');

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-72"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                <MessageCircle className="size-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Chat with us</h4>
                <p className="text-xs text-amber-600 dark:text-amber-400">Lightworld Technologies</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { icon: Clock, text: 'Typically replies within minutes' },
                { icon: Shield, text: 'Your data is safe & secure' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <item.icon className="size-3.5 text-amber-500 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium gap-2">
                <Send className="size-4" />
                Start Conversation
              </Button>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`size-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
            isOpen
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-[#25D366] hover:bg-[#20BD5A] text-white animate-pulse-glow'
          }`}
          size="icon"
        >
          {isOpen ? (
            <X className="size-6" />
          ) : (
            <MessageCircle className="size-6" />
          )}
          <span className="sr-only">
            {isOpen ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}
          </span>
        </Button>
      </motion.div>
    </div>
  );
}
