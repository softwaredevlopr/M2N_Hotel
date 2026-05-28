import { Phone, Mail, MapPin } from "lucide-react";
import { formatAddress } from "@/lib/format";

function InstagramIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const QUICK_LINKS = [
  { label: "About", href: "#about" },
  { label: "Rooms", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const POLICIES = [
  { label: "Cancellation Policy", href: "#" },
  { label: "Privacy Notice", href: "#" },
  { label: "Terms of Stay", href: "#" },
  { label: "Careers", href: "#" },
];

const SOCIALS = [
  { icon: InstagramIcon, href: "#", label: "Instagram" },
  { icon: FacebookIcon, href: "#", label: "Facebook" },
  { icon: TwitterIcon, href: "#", label: "Twitter" },
];

const FALLBACK_TAGLINE =
  "A boutique luxury hotel — pairing heritage craft with quiet modern hospitality.";

export default function Footer({ hotel }) {
  const brand = hotel?.name?.toUpperCase?.() || "M2N HOTEL";
  const tagline = hotel?.tagline || FALLBACK_TAGLINE;
  const phone = hotel?.phone || "+91 141 355 8899";
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const email = hotel?.email || "reservations@m2nhotel.in";
  const address = formatAddress(hotel);
  const craftedLocation = hotel?.city || "every detail";

  return (
    <footer className="bg-ink border-t border-ink-line">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/60 text-accent font-display text-lg">
                M
              </span>
              <span className="font-display text-lg tracking-[0.25em] text-cream">
                {brand}
              </span>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-cream-dim max-w-xs">
              {tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center border border-ink-line text-cream-dim hover:border-gold hover:text-gold transition-colors"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase text-gold">
              Discover
            </h3>
            <ul className="mt-6 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-cream-dim hover:text-gold transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase text-gold">
              Hotel Info
            </h3>
            <ul className="mt-6 space-y-3">
              {POLICIES.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-cream-dim hover:text-gold transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase text-gold">
              Reach Us
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-cream-dim">
              {address && (
                <li className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 h-4 w-4 text-gold flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <span>{address}</span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gold" strokeWidth={1.5} />
                <a
                  href={phoneHref}
                  className="hover:text-gold transition-colors"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gold" strokeWidth={1.5} />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-gold transition-colors break-all"
                >
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-ink-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs tracking-[0.2em] uppercase text-cream-muted">
          <div>
            © {new Date().getFullYear()} {brand} Pvt. Ltd. · All rights
            reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-8 bg-accent/50" />
            Crafted with care in {craftedLocation}
            <span className="h-px w-8 bg-accent/50" />
          </div>
        </div>
      </div>
    </footer>
  );
}
