import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lightworld Technologies Limited – The World of Possibilities",
  description: "We develop and design websites, Mobile Apps, School Management Software and other CRMs, Computer Science Training, Beads and Crafts Design Training, etc",
  keywords: ["Lightworld Technologies", "Web Development", "Mobile App Development", "IT Solutions", "Ghana", "Software Development", "Digital Marketing", "SEO"],
  authors: [{ name: "Lightworld Technologies" }],
  icons: {
    icon: "https://www.lightworldtech.com/wp-content/uploads/2018/10/Lightworldtech-Logo-favicon-1.png",
  },
  openGraph: {
    title: "Lightworld Technologies Limited – The World of Possibilities",
    description: "Innovative IT solutions provider offering web development, mobile app development, software development, and digital marketing services in Ghana.",
    siteName: "Lightworld Technologies",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lightworld Technologies Limited",
    description: "The World of Possibilities - Innovative IT Solutions",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
