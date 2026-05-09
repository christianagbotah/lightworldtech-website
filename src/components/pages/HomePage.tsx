'use client';

import { useSEO } from '@/hooks/use-seo';
import HeroSection from '@/components/sections/HeroSection';
import ClientLogoCarousel from '@/components/sections/ClientLogoCarousel';
import ServicesSection from '@/components/sections/ServicesSection';
import PricingSection from '@/components/sections/PricingSection';
import AboutSection from '@/components/sections/AboutSection';
import StatsCounterSection from '@/components/sections/StatsCounterSection';
import IndustriesSection from '@/components/sections/IndustriesSection';
import ProcessSection from '@/components/sections/ProcessSection';
import PortfolioSection from '@/components/sections/PortfolioSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import VideoTestimonialsSection from '@/components/sections/VideoTestimonialsSection';
import FAQSection from '@/components/sections/FAQSection';
import CTASection from '@/components/sections/CTASection';
import TechStackSection from '@/components/sections/TechStackSection';
import SectionDivider from '@/components/ui/section-divider';
import BackToTop from '@/components/ui/back-to-top';

export default function HomePage() {
  useSEO({
    title: 'Home',
    description: 'Lightworld Technologies Limited - Leading IT solutions provider in Ghana. Web development, mobile apps, SEO, software development, and IT training in Accra.',
    keywords: ['IT company Ghana', 'web development Ghana', 'mobile app development', 'SEO Ghana', 'software development Accra', 'Lightworld Technologies'],
  });
  return (
    <main>
      <HeroSection />
      <SectionDivider variant="wave" className="-mt-1" />
      <ClientLogoCarousel />
      <SectionDivider variant="dots" />
      <TechStackSection />
      <SectionDivider variant="wave" />
      <ServicesSection />
      <SectionDivider variant="curve" />
      <PricingSection />
      <SectionDivider variant="angle" />
      <AboutSection />
      <StatsCounterSection />
      <SectionDivider variant="dots" />
      <IndustriesSection />
      <SectionDivider variant="wave" flip />
      <ProcessSection />
      <SectionDivider variant="curve" flip />
      <PortfolioSection />
      <SectionDivider variant="dots" />
      <TestimonialsSection />
      <SectionDivider variant="wave" flip />
      <VideoTestimonialsSection />
      <SectionDivider variant="angle" />
      <FAQSection />
      <SectionDivider variant="wave" />
      <CTASection />
      <BackToTop />
    </main>
  );
}
