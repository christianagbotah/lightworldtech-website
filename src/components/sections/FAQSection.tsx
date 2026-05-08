'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

  useEffect(() => {
    fetcher('/api/faqs')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFaqs(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-slate-50" id="faq">
      <div className="container-main">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600">
              Find answers to common questions about our services and processes.
            </p>
          </motion.div>

          {/* FAQ accordion */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg bg-white">
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
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className="border rounded-lg bg-white px-6 data-[state=open]:shadow-sm data-[state=open]:border-emerald-200 transition-all"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
