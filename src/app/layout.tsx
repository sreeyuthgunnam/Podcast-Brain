import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Podcast Brain - AI-Powered Podcast Search",
    template: "%s | Podcast Brain",
  },
  description:
    "Search, summarize, and chat with hundreds of hours of podcast content instantly using AI.",
  keywords: [
    "podcast",
    "AI",
    "search",
    "transcription",
    "summary",
    "chat",
    "audio",
    "machine learning",
  ],
  authors: [{ name: "Podcast Brain" }],
  creator: "Podcast Brain",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://podcastbrain.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://podcastbrain.app",
    title: "Podcast Brain - AI-Powered Podcast Search",
    description:
      "Search, summarize, and chat with hundreds of hours of podcast content instantly using AI.",
    siteName: "Podcast Brain",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Podcast Brain - AI-Powered Podcast Search",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Podcast Brain - AI-Powered Podcast Search",
    description:
      "Search, summarize, and chat with hundreds of hours of podcast content instantly using AI.",
    images: ["/og-image.png"],
  },
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
