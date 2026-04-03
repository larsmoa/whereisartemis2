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
  title: "Where is Artemis? — Live Artemis II Tracker",
  description:
    "Real-time 3D tracking of NASA's Artemis II spacecraft. Live position, speed, and distance data from JPL Horizons.",
  openGraph: {
    title: "Where is Artemis? — Live Artemis II Tracker",
    description:
      "Real-time 3D tracking of NASA's Artemis II spacecraft. See where Orion is right now.",
    url: "https://whereisartemis.com",
    siteName: "whereisartemis.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
