import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/ui/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whereisartemis.com"),
  title: "Where is Artemis? — Live Artemis II Tracker",
  description:
    "Real-time 3D tracking of NASA's Artemis II spacecraft. Live position, speed, and distance data from JPL Horizons.",
  keywords: [
    "Artemis II",
    "Orion spacecraft",
    "NASA",
    "live tracker",
    "real-time",
    "lunar mission",
  ],
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://whereisartemis.com",
  },
  openGraph: {
    title: "Where is Artemis? — Live Artemis II Tracker",
    description:
      "Real-time 3D tracking of NASA's Artemis II spacecraft. See where Orion is right now.",
    url: "https://whereisartemis.com",
    siteName: "whereisartemis.com",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Where is Artemis? — Live Artemis II Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Where is Artemis? — Live Artemis II Tracker",
    description:
      "Real-time 3D tracking of NASA's Artemis II spacecraft. See where Orion is right now.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Where is Artemis?",
  url: "https://whereisartemis.com",
  description: "Real-time 3D tracking of NASA's Artemis II spacecraft.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
