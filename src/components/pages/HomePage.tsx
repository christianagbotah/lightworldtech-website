'use client';

import HeroSection from '@/components/sections/HeroSection';
import ClientLogoCarousel from '@/components/sections/ClientLogoCarousel';
import ServicesSection from '@/components/sections/ServicesSection';
import AboutSection from '@/components/sections/AboutSection';
import IndustriesSection from '@/components/sections/IndustriesSection';
import ProcessSection from '@/components/sections/ProcessSection';
import PortfolioSection from '@/components/sections/PortfolioSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import FAQSection from '@/components/sections/FAQSection';
import CTASection from '@/components/sections/CTASection';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ClientLogoCarousel />
      <ServicesSection />
      <AboutSection />
      <IndustriesSection />
      <ProcessSection />
      <PortfolioSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}
