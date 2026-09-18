import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import TeamPage from '@/components/pages/TeamPage';

export const metadata: Metadata = {
  title: 'Leadership Team',
  description: 'Meet the executive leadership of Lightworld Technologies Limited: Christian Agbotah, CEO & Director, and Rober Yaw Essuon, Managing Director.',
  alternates: { canonical: '/team' },
  openGraph: {
    title: 'Leadership | Lightworld Technologies',
    description: 'Meet the executive leadership of Lightworld Technologies Limited.',
    url: '/team',
  },
};

export default function Team() {
  return (
    <PublicShell>
      <TeamPage />
    </PublicShell>
  );
}
