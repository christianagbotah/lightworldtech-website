const visualsBySlug: Record<string, string> = {
  'production-ready-business-software-checklist': '/images/portfolio/erp-system.png',
  'mobile-first-digital-products-africa': '/images/hero-slide-4.png',
  'when-to-build-custom-business-software': '/images/services-showcase.png',
  'practical-ai-automation-business': '/images/hero-slide-2.png',
};

const categoryVisuals: Record<string, string> = {
  technology: '/images/hero-slide-2.png',
  'web-development': '/images/hero-slide-2.png',
  business: '/images/portfolio/erp-system.png',
  design: '/images/process-workflow.png',
  'mobile-apps': '/images/hero-slide-4.png',
};

export function getBlogCoverImage(post: {
  slug: string;
  coverImage?: string | null;
  category?: { slug?: string | null; name?: string | null } | null;
}): string {
  if (post.coverImage?.trim()) return post.coverImage;
  if (visualsBySlug[post.slug]) return visualsBySlug[post.slug];

  const categorySlug = post.category?.slug || '';
  const categoryName = (post.category?.name || '').toLowerCase().replace(/\s+/g, '-');
  return categoryVisuals[categorySlug] || categoryVisuals[categoryName] || '/images/hero-slide-3.png';
}
