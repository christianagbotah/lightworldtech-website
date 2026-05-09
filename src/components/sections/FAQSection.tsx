'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* ── Left Column: Technology Image ── */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Gradient border wrapper */}
            <div className="rounded-2xl p-[3px] bg-gradient-to-br from-emerald-500 via-amber-400 to-emerald-600 shadow-2xl shadow-emerald-500/10 dark:shadow-amber-500/5">
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
                <Image
                  src="/images/hero-slide-1.png"
                  alt="Technology solutions by Lightworld Technologies"
                  width={1152}
                  height={864}
                  className="w-full h-auto object-cover"
                  priority={false}
                />
              </div>
            </div>

            {/* Floating decorative orbs */}
            <motion.div
              className="absolute -top-4 -left-4 size-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-400/30 dark:shadow-emerald-400/20 z-10"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -top-2 -right-3 size-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/30 dark:shadow-amber-400/20 z-10"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            <motion.div
              className="absolute -bottom-3 right-8 size-5 rounded-full bg-gradient-to-br from-emerald-300 to-amber-400 shadow-md shadow-emerald-300/30 dark:shadow-emerald-300/20 z-10"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <motion.div
              className="absolute top-1/2 -left-6 size-4 rounded-full bg-amber-300 dark:bg-amber-500 shadow-md shadow-amber-300/30 dark:shadow-amber-500/20 z-10"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />

            {/* Decorative accent bar below the image */}
            <motion.div
              className="mt-5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 mx-4"
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            />

            {/* Accent label under the bar */}
            <motion.div
              className="mt-4 flex items-center gap-2 px-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Trusted by 100+ clients across Africa
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right Column: FAQ Content ── */}
          <div>
            {/* Section header */}
            <motion.div
              className="mb-8"
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
                className="pl-11 pr-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-500 h-11 shadow-sm focus-visible:shadow-lg focus-visible:shadow-emerald-500/10 dark:focus-visible:shadow-emerald-500/5 transition-all duration-300"
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
                          className="border rounded-xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/50 px-6 data-[state=open]:shadow-lg data-[state=open]:shadow-emerald-500/5 data-[state=open]:border-amber-300 dark:data-[state=open]:border-amber-600/50 data-[state=open]:bg-gradient-to-r data-[state=open]:from-amber-50/60 data-[state=open]:to-white dark:data-[state=open]:from-amber-900/10 dark:data-[state=open]:to-slate-800/80 transition-all duration-300 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4 text-slate-900 dark:text-white data-[state=open]:text-amber-500 dark:data-[state=open]:text-amber-400 transition-colors [&>svg]:text-slate-400 [&>svg]:data-[state=open]:text-emerald-600 dark:[&>svg]:data-[state=open]:text-amber-400">
                            <span className="flex items-center gap-3">
                              <span className="relative size-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/60 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-amber-400 shrink-0 shadow-sm border border-amber-200/50 dark:border-amber-700/30">
                                {String(index + 1).padStart(2, '0')}
                                {index < filteredFaqs.length - 1 && (
                                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-px h-3 bg-gradient-to-b from-amber-300/40 to-transparent dark:from-amber-600/30" aria-hidden="true" />
                                )}
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
              className="mt-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-gradient-to-br from-amber-50 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl p-8 md:p-10 border border-amber-100 dark:border-amber-800/30 relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative text-center">
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
      </div>
    </section>
  );
}
