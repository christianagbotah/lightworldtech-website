import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/ui/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.lightworldtech.com";
const OG_IMAGE = "https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png";
const DESCRIPTION = "Innovative IT solutions provider offering web development, mobile app development, software development, and digital marketing services in Ghana. Transforming businesses through technology.";

export const metadata: Metadata = {
  title: {
    default: "Lightworld Technologies Limited – The World of Possibilities",
    template: "%s | Lightworld Technologies",
  },
  description: DESCRIPTION,
  keywords: [
    "Lightworld Technologies",
    "Web Development Ghana",
    "Mobile App Development",
    "IT Solutions Ghana",
    "Software Development",
    "Digital Marketing",
    "SEO Ghana",
    "School Management Software",
    "CRM Development",
    "Accra Web Design",
    "Ghana IT Company",
  ],
  authors: [{ name: "Lightworld Technologies", url: SITE_URL }],
  creator: "Lightworld Technologies Limited",
  publisher: "Lightworld Technologies Limited",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png" },
    ],
  },
  openGraph: {
    title: "Lightworld Technologies Limited – The World of Possibilities",
    description: DESCRIPTION,
    siteName: "Lightworld Technologies",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Lightworld Technologies - IT Solutions Ghana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lightworld Technologies Limited – The World of Possibilities",
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: "@lightworldtech",
  },
  verification: {
    google: "your-google-verification-code",
  },
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
        <meta name="theme-color" content="#059669" />
        <link rel="icon" href="https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png" sizes="32x32" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
