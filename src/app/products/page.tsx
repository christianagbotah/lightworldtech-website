import type { Metadata } from 'next';
import PublicShell from '@/components/layout/PublicShell';
import ProductsPage from '@/components/pages/ProductsPage';

export const metadata: Metadata = {
  title: 'Digital Products',
  description: 'Discover digital products and platforms being developed by Lightworld Technologies for teams, businesses and institutions.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'Lightworld Technologies Digital Products',
    description: 'Digital products and platforms for teams, businesses and institutions.',
    url: '/products',
  },
};

export default function Products() {
  return <PublicShell><ProductsPage /></PublicShell>;
}
