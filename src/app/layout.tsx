import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import MotionPreferenceProvider from '@/components/providers/MotionPreferenceProvider';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/ui/json-ld';
import { getSeoConfig } from '@/lib/seo-config';

function seoAbsoluteFeedUrl(siteUrl: string): string {
  return new URL('/feed.xml', siteUrl + '/').toString();
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoConfig();

  return {
    metadataBase: new URL(seo.siteUrl),
    applicationName: seo.siteName,
    title: {
      default: seo.defaultTitle,
      template: '%s | ' + seo.siteName,
    },
    description: seo.description,
    alternates: {
      types: {
        'application/rss+xml': seoAbsoluteFeedUrl(seo.siteUrl),
      },
    },
    keywords: seo.keywords,
    authors: [{ name: seo.legalName, url: seo.siteUrl }],
    creator: seo.legalName,
    publisher: seo.legalName,
    category: 'technology',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    verification: {
      ...(seo.googleVerification ? { google: seo.googleVerification } : {}),
      ...(seo.bingVerification ? { other: { 'msvalidate.01': seo.bingVerification } } : {}),
    },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: seo.logoUrl, type: 'image/png' }],
      apple: [{ url: seo.logoUrl, type: 'image/png' }],
    },
    openGraph: {
      type: 'website',
      locale: seo.locale,
      url: seo.siteUrl,
      siteName: seo.siteName,
      title: seo.defaultTitle,
      description: seo.description,
      images: [
        {
          url: seo.ogImage,
          width: 1200,
          height: 630,
          alt: seo.siteName + ' digital engineering and IT solutions',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.defaultTitle,
      description: seo.description,
      images: [seo.ogImage],
    },
    appleWebApp: {
      capable: true,
      title: seo.siteName,
      statusBarStyle: 'black-translucent',
    },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9f8' },
    { media: '(prefers-color-scheme: dark)', color: '#050b10' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seo = await getSeoConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd config={seo} />
        <WebSiteJsonLd config={seo} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.remove('dark')}",
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <MotionPreferenceProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </MotionPreferenceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
