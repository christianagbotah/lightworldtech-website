'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const quickReplies = [
  { label: 'Web Development', text: 'I\'m interested in Web Development services' },
  { label: 'Mobile App', text: 'I\'d like to know about Mobile App development' },
  { label: 'Get a Quote', text: 'I\'d like to get a quote for a project' },
];

const autoReplies = [
  'Thanks for your message! Our team will get back to you shortly. You can also reach us at +233 (024) 361 8186 or mail@lightworldtech.com.',
  'Great question! Let me connect you with our team. In the meantime, feel free to explore our Services page for more details.',
  'Thank you for reaching out! We typically respond within 1 business hour. For urgent inquiries, please call us directly.',
];

const STORAGE_KEY = 'lw-chat-history';

function loadChatHistory(): ChatMessage[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveChatHistory(messages: ChatMessage[]) {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="size-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
        <MessageCircle className="size-3.5 text-white" />
      </div>
      <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const replyIndexRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const history = loadChatHistory();
      // Use microtask to avoid setState-in-effect lint error
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

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback((text: string) => {
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
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-[340px] sm:w-[380px] h-[480px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="size-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Lightworld Support</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-300" />
                    </span>
                    <span className="text-xs text-emerald-100">We&apos;re online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="size-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="size-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="size-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Close chat"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="size-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                      <MessageCircle className="size-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-sm'
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
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-700 text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border-none"
                  aria-label="Chat message input"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md"
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

      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <Button
          onClick={() => {
            if (isMinimized) {
              setIsMinimized(false);
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className={`size-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 relative group ${
            isOpen && !isMinimized
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
          }`}
          size="icon"
          aria-label={isOpen && !isMinimized ? 'Close live chat' : 'Open live chat'}
        >
          {isOpen && !isMinimized ? (
            <X className="size-6" />
          ) : (
            <>
              <MessageCircle className="size-6" />
              {/* Notification badge */}
              {!isOpen && messages.length <= 1 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
                  <span className="absolute size-4 rounded-full bg-amber-400 animate-ping opacity-75" />
                  <span className="relative flex size-3 rounded-full bg-amber-400" />
                </span>
              )}
            </>
          )}
        </Button>
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Live Chat
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800 dark:border-r-slate-200" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
