import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

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
  title: "M2N Hotel — Boutique Luxury Stays",
  description:
    "A boutique luxury hotel pairing heritage interiors with modern hospitality — rooftop dining, curated experiences and warm welcomes for every guest.",
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
