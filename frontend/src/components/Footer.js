import { Phone, Mail, MapPin } from "lucide-react";
import { formatAddress, formatPhoneDisplay, phoneHref } from "@/lib/format";
import BrandLogo from "./BrandLogo";
import {
  BRAND_TAGLINE,
  BRAND_LEGAL_NAME,
  BRAND_EMAIL,
  BRAND_PHONE,
  BRAND_LOCATION,
} from "@/lib/brand";
import { getHotelPolicyLinks, getHotelSocialLinks } from "@/lib/policies";

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

const DEFAULT_SOCIALS = [
  { icon: InstagramIcon, href: "#", label: "Instagram" },
  { icon: FacebookIcon, href: "#", label: "Facebook" },
  { icon: TwitterIcon, href: "#", label: "Twitter" },
];

export default function Footer({ hotel }) {
  const tagline = hotel?.tagline || BRAND_TAGLINE;
  // Fall back to brand-level contact details when no hotel-specific value is
  // available (e.g. the homepage footer), so "Reach Us" is never empty.
  const phoneRaw = hotel?.phone || BRAND_PHONE;
  const phone = formatPhoneDisplay(phoneRaw);
  const phoneLink = phoneHref(phoneRaw);
  const email = hotel?.email || BRAND_EMAIL;
  const address = formatAddress(hotel) || BRAND_LOCATION;
  const policies = getHotelPolicyLinks(hotel);
  const apiSocials = getHotelSocialLinks(hotel);
  const socials =
    apiSocials.length > 0
      ? apiSocials.map((social) => ({
          icon:
            social.platform?.toLowerCase() === "facebook"
              ? FacebookIcon
              : social.platform?.toLowerCase() === "twitter" ||
                  social.platform?.toLowerCase() === "x"
                ? TwitterIcon
                : InstagramIcon,
          href: social.href,
          label: social.label,
        }))
      : DEFAULT_SOCIALS;

  return (
    <footer className="bg-ink border-t border-ink-line">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div>
            <div className="flex items-center">
              <BrandLogo variant="footer" />
            </div>
            <p className="mt-6 text-sm leading-relaxed text-cream-dim max-w-xs">
              {tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socials.map((social) => (
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
              {policies.map((link) => (
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
                  <span className="whitespace-pre-line">{address}</span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gold" strokeWidth={1.5} />
                  {phoneLink ? (
                    <a
                      href={phoneLink}
                      className="hover:text-gold transition-colors"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span>{phone}</span>
                  )}
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gold" strokeWidth={1.5} />
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-gold transition-colors break-all"
                  >
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-ink-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs tracking-[0.2em] uppercase text-cream-muted">
          <div>
            © {new Date().getFullYear()} {BRAND_LEGAL_NAME}. All Rights Reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-8 bg-accent/50" />
            Crafted with care by {BRAND_LEGAL_NAME}
            <span className="h-px w-8 bg-accent/50" />
          </div>
        </div>
      </div>
    </footer>
  );
}
