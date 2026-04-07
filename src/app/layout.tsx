import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Where is Artemis II Right Now? — Live Real-Time Tracker",
  description:
    "Track Artemis II live — real-time position, speed, and distance from Earth for the Orion spacecraft right now. NASA/JPL data updated every 30 seconds.",
  keywords: [
    "Artemis II",
    "Artemis 2",
    "where is Artemis 2 now",
    "Artemis 2 tracker",
    "Artemis live tracker",
    "Artemis location",
    "Artemis live location",
    "Artemis real time location",
    "Orion spacecraft",
    "Orion capsule tracker",
    "NASA live tracker",
    "lunar mission",
    "Artemis 2 live",
    "Artemis live stream",
  ],
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://whereisartemis.com",
  },
  openGraph: {
    title: "Where is Artemis II Right Now? — Live Real-Time Tracker",
    description:
      "Track Artemis II live — real-time position, speed, and distance from Earth for the Orion spacecraft right now. NASA/JPL data updated every 30 seconds.",
    url: "https://whereisartemis.com",
    siteName: "whereisartemis.com",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Where is Artemis II Right Now? — Live Real-Time Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Where is Artemis II Right Now? — Live Real-Time Tracker",
    description:
      "Track Artemis II live — real-time position, speed, and distance from Earth for the Orion spacecraft right now. NASA/JPL data updated every 30 seconds.",
    images: ["/og-image.png"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Where is Artemis?",
    url: "https://whereisartemis.com",
    description: "Real-time 3D tracking of NASA's Artemis II spacecraft.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Where is Artemis II Right Now? — Live Real-Time Tracker",
    url: "https://whereisartemis.com",
    description:
      "Track Artemis II live — real-time position, speed, and distance from Earth for the Orion spacecraft right now. NASA/JPL data updated every 30 seconds.",
    dateModified: new Date().toISOString(),
    about: {
      "@type": "Thing",
      name: "Artemis II",
      description:
        "NASA's Artemis II is the first crewed lunar flyby mission since Apollo 17, launching astronauts aboard the Orion spacecraft on a Space Launch System rocket.",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where is Artemis II right now?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The live tracker on whereisartemis.com shows the real-time position of NASA's Artemis II Orion spacecraft. Position data is pulled from NASA/JPL Horizons every 30 seconds.",
        },
      },
      {
        "@type": "Question",
        name: "How fast is Artemis 2 going?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Orion's speed changes throughout the mission — fastest just after trans-lunar injection, then slowing as it climbs away from Earth's gravity well. The live speed readout on this tracker shows the current velocity in km/s.",
        },
      },
      {
        "@type": "Question",
        name: "How long will it take Artemis 2 to get to the Moon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Artemis II mission is a roughly 10-day crewed lunar flyby. Orion takes several days to reach the Moon, performs a close approach, and uses lunar gravity to slingshot back toward Earth.",
        },
      },
      {
        "@type": "Question",
        name: "When will Artemis II reach the Moon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The mission timeline panel on whereisartemis.com shows all planned milestones — including closest lunar approach — with live countdowns. The Artemis II crew will fly around the Moon without landing.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a live stream for Artemis 2?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — whereisartemis.com embeds the NASA YouTube live feed alongside the 3D tracker. NASA TV covers launches, manoeuvres, lunar flyby, and splashdown.",
        },
      },
      {
        "@type": "Question",
        name: "Who are the Artemis II astronauts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Artemis II crew consists of Commander Reid Wiseman, Pilot Victor Glover, Mission Specialist Christina Koch (NASA), and Mission Specialist Jeremy Hansen (CSA).",
        },
      },
      {
        "@type": "Question",
        name: "How is the spacecraft position tracked?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Position data comes from NASA/JPL Horizons, the same ephemeris system used by planetary scientists worldwide. The Orion spacecraft is tracked as body -1024, with data updated every 30 seconds.",
        },
      },
      {
        "@type": "Question",
        name: "How long is the Artemis II mission?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Artemis II is planned as a 10-day mission. The crew launches aboard a Space Launch System (SLS) rocket, travels to the Moon on a free-return trajectory, and splashes down in the Pacific Ocean.",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
