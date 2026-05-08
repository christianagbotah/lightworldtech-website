'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Target, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const stats = [
  { value: '100+', label: 'Projects Completed' },
  { value: '100+', label: 'Satisfied Clients' },
  { value: '8+', label: 'Years of Experience' },
  { value: '100%', label: 'Client Satisfaction' },
];

const highlights = [
  { icon: Target, title: 'Our Mission', text: 'To deliver innovative IT solutions that empower businesses to achieve their digital transformation goals and drive sustainable growth.' },
  { icon: Eye, title: 'Our Vision', text: 'To be Africa\'s leading technology partner, recognized for excellence, innovation, and the positive impact we create for our clients.' },
];

export default function AboutSection() {
  const { navigate } = useAppStore();

  return (
    <section className="section-padding bg-slate-50" id="about">
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Who We Are</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-6">
              Innovating the Future of{' '}
              <span className="text-gradient">Technology</span>
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Lightworld Technologies is a premier IT solutions company based in South Africa. Since our founding, we have been committed to delivering world-class technology services that help businesses of all sizes achieve their goals.
            </p>
            <p className="text-slate-600 leading-relaxed mb-8">
              Our team of skilled developers, designers, and digital strategists work collaboratively to craft solutions that are not only technically excellent but also aligned with our clients&apos; business objectives. We believe in building lasting partnerships through trust, transparency, and tangible results.
            </p>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {highlights.map((item) => (
                <div key={item.title} className="flex gap-3 p-4 rounded-lg bg-white border border-slate-200">
                  <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <item.icon className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate('about')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Learn More About Us
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </motion.div>

          {/* Right: Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm text-center"
                  whileHover={{ y: -4, shadow: 'lg' }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Trust indicators */}
            <div className="mt-6 p-6 rounded-xl bg-emerald-600 text-white">
              <h4 className="font-semibold mb-3">Why Choose Us?</h4>
              <ul className="space-y-2">
                {['Award-winning IT solutions', 'Dedicated support team', 'Agile development methodology', 'Competitive pricing'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-emerald-50">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
