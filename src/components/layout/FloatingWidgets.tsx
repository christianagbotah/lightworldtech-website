'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Bot,
  ArrowUp,
  Clock,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ─── WhatsApp Config ────────────────────────────────────────────────
const whatsappNumber = '233243618186';
const whatsappMessage = encodeURIComponent(
  'Hello Lightworld Technologies! I would like to inquire about your services.'
);

// ─── LiveChat Config ────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const quickReplies = [
  { label: 'Web Development', text: "I'm interested in Web Development services" },
  { label: 'Mobile App', text: "I'd like to know about Mobile App development" },
  { label: 'Get a Quote', text: "I'd like to get a quote for a project" },
];

const autoReplies = [
  'Thanks for your message! Our team will get back to you shortly. You can also reach us at +233 (024) 361 8186 or mail@lightworldtech.com.',
  'Great question! Let me connect you with our team. In the meantime, feel free to explore our Services page for more details.',
  'Thank you for reaching out! We typically respond within 1 business hour. For urgent inquiries, please call us directly.',
];

const CHAT_STORAGE_KEY = 'lw-chat-history';

function loadChatHistory(): ChatMessage[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveChatHistory(msgs: ChatMessage[]) {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="size-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="size-3.5 text-white" />
      </div>
      <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span
            className="size-2 rounded-full bg-amber-400 dark:bg-amber-500 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="size-2 rounded-full bg-amber-400 dark:bg-amber-500 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="size-2 rounded-full bg-amber-400 dark:bg-amber-500 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── BackToTop Sub-component ────────────────────────────────────────
function BackToTopButton() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollPercent(
          Math.min(100, Math.round((window.scrollY / docHeight) * 100))
        );
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const size = 40;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (scrollPercent / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{
            scale: 1.1,
            y: -2,
            transition: { type: 'spring', stiffness: 400, damping: 15 },
          }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="group"
          aria-label="Back to top"
        >
          <svg
            width={size}
            height={size}
            className="absolute inset-0 -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-white/20 dark:text-slate-600/20"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#floatingProgressGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-150 ease-out"
            />
            <defs>
              <linearGradient
                id="floatingProgressGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-colors">
            <ArrowUp className="size-4" />
          </div>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Back to top &middot; {scrollPercent}% scrolled
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main FloatingWidgets Component ─────────────────────────────────
export default function FloatingWidgets() {
  // Visibility (delayed entrance)
  const [visible, setVisible] = useState(false);

  // BackToTop
  const [backToTopVisible, setBackToTopVisible] = useState(false);

  // WhatsApp
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // LiveChat
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [liveChatMinimized, setLiveChatMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const replyIndexRef = useRef(0);

  // ─── Effects ────────────────────────────────────────────────────

  // Delayed visibility
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // BackToTop visibility
  useEffect(() => {
    const handleScroll = () => {
      setBackToTopVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize chat
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const history = loadChatHistory();
      queueMicrotask(() => {
        if (history.length > 0) {
          setMessages(history);
          setShowQuickReplies(false);
        } else {
          const welcomeMsg: ChatMessage = {
            id: 'welcome',
            text: 'Hello! \ud83d\udc4b Welcome to Lightworld Technologies. How can we help you today?',
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages([welcomeMsg]);
          saveChatHistory([welcomeMsg]);
        }
      });
    }
  }, []);

  // Auto-focus chat input
  useEffect(() => {
    if (liveChatOpen && !liveChatMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [liveChatOpen, liveChatMinimized]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ─── Handlers ──────────────────────────────────────────────────

  // Mutual exclusion: opening one closes the other
  const handleWhatsappToggle = () => {
    setWhatsappOpen((prev) => {
      const next = !prev;
      if (next) {
        setLiveChatOpen(false);
        setLiveChatMinimized(false);
      }
      return next;
    });
  };

  const handleLiveChatToggle = () => {
    if (liveChatMinimized) {
      setLiveChatMinimized(false);
      return;
    }
    setLiveChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setWhatsappOpen(false);
      }
      return next;
    });
  };

  const handleLiveChatMinimize = () => {
    setLiveChatMinimized(true);
  };

  const handleLiveChatClose = () => {
    setLiveChatOpen(false);
    setLiveChatMinimized(false);
  };

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      };

      const updated = [...messages, userMsg];
      setMessages(updated);
      saveChatHistory(updated);
      setInputValue('');
      setShowQuickReplies(false);
      setIsTyping(true);

      setTimeout(() => {
        const replyText = autoReplies[replyIndexRef.current % autoReplies.length];
        replyIndexRef.current += 1;

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          text: replyText,
          sender: 'bot',
          timestamp: new Date(),
        };

        const withReply = [...updated, botMsg];
        setMessages(withReply);
        saveChatHistory(withReply);
        setIsTyping(false);
      }, 2000);
    },
    [messages]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  if (!visible) return null;

  // Determine if any popup is open (for pill styling)
  const anyPopupOpen = whatsappOpen || (liveChatOpen && !liveChatMinimized);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ─── BackToTop (above the widget row) ─────────────────── */}
      <TooltipProvider delayDuration={200}>
        <AnimatePresence>
          {backToTopVisible && <BackToTopButton />}
        </AnimatePresence>
      </TooltipProvider>

      {/* ─── Popup Area (above button row) ────────────────────── */}
      <div className="flex items-end gap-2 justify-end">
        {/* LiveChat Popup */}
        <AnimatePresence>
          {liveChatOpen && !liveChatMinimized && (
            <motion.div
              key="livechat-popup"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-[340px] sm:w-[380px] h-[480px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-amber-600 via-amber-600 to-yellow-600 dark:from-amber-500 dark:via-amber-500 dark:to-yellow-800 px-5 py-4 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 grid-pattern opacity-10" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/10">
                    <MessageCircle className="size-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      Lightworld Support
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2 bg-amber-300" />
                      </span>
                      <span className="text-xs text-amber-100">
                        We&apos;re online
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                  <button
                    onClick={handleLiveChatMinimize}
                    className="size-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                    aria-label="Minimize chat"
                  >
                    <Minimize2 className="size-4" />
                  </button>
                  <button
                    onClick={handleLiveChatClose}
                    className="size-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/80 dark:bg-slate-900/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      msg.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="size-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="size-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-tr-sm shadow-md shadow-emerald-500/20'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm rounded-tl-sm border border-slate-100 dark:border-slate-600'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
                {showQuickReplies && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.label}
                        onClick={() => handleQuickReply(reply.text)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-300 dark:border-emerald-500 text-amber-500 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm hover:shadow-md"
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSubmit}
                className="p-3 border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-700/50 text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border border-slate-200 dark:border-slate-600 focus:border-amber-400 dark:focus:border-emerald-500 transition-all duration-200"
                    aria-label="Chat message input"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shrink-0 shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                    disabled={!inputValue.trim()}
                  >
                    <Send className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Popup */}
        <AnimatePresence>
          {whatsappOpen && (
            <motion.div
              key="whatsapp-popup"
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
                  <h4 className="font-semibold text-sm text-foreground">
                    Chat with us
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-amber-400">
                    Lightworld Technologies
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { icon: Clock, text: 'Typically replies within minutes' },
                  { icon: Shield, text: 'Your data is safe & secure' },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                  >
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
      </div>

      {/* ─── Button Row (pill-shaped container) ────────────────── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        className={cn(
          'relative rounded-2xl shadow-xl border p-1.5 flex items-center gap-1',
          'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md',
          'border-slate-200/50 dark:border-slate-700/50',
          anyPopupOpen && 'shadow-2xl'
        )}
      >
        {/* WhatsApp Button */}
        <Button
          onClick={handleWhatsappToggle}
          size="icon"
          className={cn(
            'size-11 rounded-xl transition-all duration-300 shrink-0',
            whatsappOpen
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
              : 'bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-md hover:shadow-lg'
          )}
          aria-label={whatsappOpen ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}
        >
          {whatsappOpen ? (
            <X className="size-5" />
          ) : (
            <MessageCircle className="size-5" />
          )}
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200/80 dark:bg-slate-600/50 shrink-0" />

        {/* LiveChat Button */}
        <div className="relative">
          <Button
            onClick={handleLiveChatToggle}
            size="icon"
            className={cn(
              'size-11 rounded-xl transition-all duration-300 shrink-0',
              liveChatOpen && !liveChatMinimized
                ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-md'
                : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-md hover:shadow-lg'
            )}
            aria-label={
              liveChatOpen && !liveChatMinimized
                ? 'Close live chat'
                : 'Open live chat'
            }
          >
            {liveChatOpen && !liveChatMinimized ? (
              <X className="size-5" />
            ) : (
              <Bot className="size-5" />
            )}
          </Button>

          {/* Notification badge */}
          {!liveChatOpen && messages.length <= 1 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
              <span className="absolute size-4 rounded-full bg-amber-400 animate-ping opacity-75" />
              <span className="relative flex size-3 rounded-full bg-amber-400" />
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
