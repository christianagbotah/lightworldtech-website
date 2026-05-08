'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, MessageCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAppStore } from '@/lib/store';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const defaultFaqs = [
  { id: '1', question: 'What services does Lightworld Technologies offer?', answer: 'We offer a comprehensive range of IT solutions including web development, mobile app development, skills training, SEO and digital marketing, custom software development, and web hosting services.' },
  { id: '2', question: 'How long does it take to complete a project?', answer: 'Project timelines vary depending on the scope and complexity. A simple website typically takes 4-6 weeks, while more complex applications can take 3-6 months. We provide detailed timelines during our initial consultation.' },
  { id: '3', question: 'Do you offer ongoing support and maintenance?', answer: 'Yes, we offer comprehensive support and maintenance packages to ensure your solutions remain up-to-date, secure, and performing optimally. Our support plans are flexible and can be tailored to your needs.' },
  { id: '4', question: 'What technologies do you work with?', answer: 'We work with a wide range of modern technologies including React, Next.js, Node.js, Python, React Native, Flutter, and more. We select the best technology stack for each project based on requirements.' },
  { id: '5', question: 'How much do your services cost?', answer: 'Our pricing is competitive and depends on the specific requirements of your project. We provide detailed, transparent quotes after understanding your needs. Contact us for a free consultation and personalized quote.' },
  { id: '6', question: 'Can you work with clients outside Ghana?', answer: 'Absolutely! While we are based in Ghana, we work with clients globally across Africa and beyond. Our team is experienced in remote collaboration and we use modern project management tools to ensure smooth communication.' },
];

export default function FAQSection() {
  const [faqs, setFaqs] = useState(defaultFaqs);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { navigate } = useAppStore();

  useEffect(() => {
    fetcher('/api/faqs')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFaqs(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    );
  }, [faqs, searchQuery]);

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden" id="faq">
      {/* Subtle background decorations */}
      <div className="absolute top-10 right-10 text-amber-200/20 dark:text-amber-800/20">
        <HelpCircle className="size-40" />
      </div>
      <div className="absolute bottom-10 left-10 text-amber-200/15 dark:text-amber-800/15">
        <HelpCircle className="size-24" />
      </div>

      <div className="container-main relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 dark:text-amber-400 uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Find answers to common questions about our services and processes.
            </p>
          </motion.div>

          {/* Search input */}
          <motion.div
            className="relative mb-8"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500/30 focus-visible:border-amber-400 dark:focus-visible:border-emerald-500 h-11"
            />
          </motion.div>

          {/* FAQ accordion */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {filteredFaqs.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-3">
                    {filteredFaqs.map((faq, index) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="border rounded-xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/50 px-6 data-[state=open]:shadow-lg data-[state=open]:shadow-emerald-500/5 data-[state=open]:border-amber-300 dark:data-[state=open]:border-amber-600/50 data-[state=open]:bg-gradient-to-r data-[state=open]:from-amber-50/60 data-[state=open]:to-white dark:data-[state=open]:from-amber-900/10 dark:data-[state=open]:to-slate-800/80 transition-all duration-300 overflow-hidden"
                      >
                        <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4 text-slate-900 dark:text-white data-[state=open]:text-amber-500 dark:data-[state=open]:text-amber-400 transition-colors [&>svg]:text-slate-400 [&>svg]:data-[state=open]:text-emerald-600 dark:[&>svg]:data-[state=open]:text-amber-400">
                          <span className="flex items-center gap-3">
                            <span className="size-7 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/60 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-amber-400 shrink-0 shadow-sm">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pb-4 pl-10">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12"
                  >
                    <Search className="size-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No matching questions found</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try a different search term</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Still have questions CTA */}
          <motion.div
            className="mt-14 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-amber-50 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl p-8 md:p-10 border border-amber-100 dark:border-amber-800/30 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="size-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                  <MessageCircle className="size-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Still Have Questions?</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                  Can&apos;t find what you&apos;re looking for? Our team is happy to help. Reach out to us and we&apos;ll get back to you within 24 hours.
                </p>
                <Button
                  onClick={() => navigate('contact')}
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12"
                >
                  Contact Us
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
