import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/brand";

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

export const metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description: BRAND_DESCRIPTION,
  icons: {
    icon: [{ url: "/m2n-logo.png", type: "image/png" }],
    apple: [{ url: "/m2n-logo.png", type: "image/png" }],
    shortcut: "/m2n-logo.png",
  },
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
