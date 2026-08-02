import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
  SITE_URL,
} from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const OG_IMAGE = {
  url: "/m2n-logo-tagline.png",
  width: 649,
  height: 373,
  alt: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: [
    "M2N Hotels",
    "hotels in Lucknow",
    "hotel booking",
    "budget hotel",
    "business hotel",
    "family stay",
    "Aurelia Grand",
    "Zaarang Inn",
  ],
  authors: [{ name: BRAND_NAME }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: SITE_URL,
    locale: "en_IN",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/m2n-logo.png", type: "image/png" }],
    apple: [{ url: "/m2n-logo.png", type: "image/png" }],
    shortcut: "/m2n-logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0B0B0B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-cream font-sans">{children}</body>
    </html>
  );
}
