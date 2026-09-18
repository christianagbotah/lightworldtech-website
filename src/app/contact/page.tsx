import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ContactPage from '@/components/pages/ContactPage';

export const metadata: Metadata = {
  title: 'Contact & Start a Project',
  description: 'Talk to Lightworld Technologies about a website, mobile app, enterprise system, AI workflow, IT training, cloud project or technology consultancy.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Start a Project with Lightworld Technologies',
    description: 'Tell us what you want to launch, improve or automate.',
    url: '/contact',
  },
};

export default function Contact() {
  return <PublicShell><ContactPage /></PublicShell>;
}
