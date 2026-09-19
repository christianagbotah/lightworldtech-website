import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/ui/json-ld';

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

const SITE_URL = 'https://www.lightworldtech.com';
const DESCRIPTION =
  'Lightworld Technologies Ltd builds modern websites, mobile apps, enterprise software, AI-enabled workflows and cloud solutions, with IT training and technology consultancy from Ghana.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Lightworld Technologies Ltd',
  title: {
    default: 'Lightworld Technologies Ltd | Software, Apps, AI & Digital Solutions',
    template: '%s | Lightworld Technologies Ltd',
  },
  description: DESCRIPTION,
  keywords: [
    'Lightworld Technologies Ltd',
    'software development Ghana',
    'web development Ghana',
    'mobile app development Ghana',
    'enterprise software Ghana',
    'AI automation Ghana',
    'IT consulting Ghana',
    'IT training Ghana',
    'cloud solutions Ghana',
    'SEO web development Ghana',
  ],
  authors: [{ name: 'Lightworld Technologies Ltd', url: SITE_URL }],
  creator: 'Lightworld Technologies Ltd',
  publisher: 'Lightworld Technologies Ltd',
  category: 'technology',
  alternates: {
    canonical: '/',
  },
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
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/logo.png', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: SITE_URL,
    siteName: 'Lightworld Technologies Ltd',
    title: 'Lightworld Technologies Ltd | Software, Apps, AI & Digital Solutions',
    description: DESCRIPTION,
    images: [
      {
        url: '/slides/slide-hero.png',
        width: 1200,
        height: 630,
        alt: 'Lightworld Technologies Ltd digital engineering and IT solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lightworld Technologies Ltd | Software, Apps, AI & Digital Solutions',
    description: DESCRIPTION,
    images: ['/slides/slide-hero.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'Lightworld Technologies Ltd',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9f8' },
    { media: '(prefers-color-scheme: dark)', color: '#050b10' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}",
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
