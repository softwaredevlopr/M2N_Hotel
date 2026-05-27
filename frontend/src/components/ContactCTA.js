import { Phone, Mail, Calendar, MapPin } from "lucide-react";
import { formatAddress, formatTimeOfDay } from "@/lib/format";

const CONTACT_BG =
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80";

function buildChannels(hotel) {
  return [
    hotel?.phone
      ? {
          icon: Phone,
          label: "Reservations",
          value: hotel.phone,
          href: `tel:${hotel.phone.replace(/\s+/g, "")}`,
        }
      : {
          icon: Phone,
          label: "Reservations",
          value: "+91 141 355 8899",
          href: "tel:+911413558899",
        },
    hotel?.email
      ? {
          icon: Mail,
          label: "Concierge",
          value: hotel.email,
          href: `mailto:${hotel.email}`,
        }
      : {
          icon: Mail,
          label: "Concierge",
          value: "reservations@m2nhotel.in",
          href: "mailto:reservations@m2nhotel.in",
        },
    {
      icon: Calendar,
      label: "Book Online",
      value: "Real-time rates",
      href: "#rooms",
    },
  ];
}

export default function ContactCTA({ hotel }) {
  const channels = buildChannels(hotel);
  const address = formatAddress(hotel) || "MI Road, Panch Batti, Jaipur 302001";
  const checkIn = formatTimeOfDay(hotel?.check_in_time) || "2:00 PM";
  const checkOut = formatTimeOfDay(hotel?.check_out_time) || "11:00 AM";

  return (
    <section id="contact" className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${CONTACT_BG})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-ink/85" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 py-28 sm:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Reserve Your Stay
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Begin your royal
            <br />
            <span className="italic text-gold">journey with us.</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            Our concierge team curates bespoke itineraries — from sunrise at
            Amber Fort to private block-print sessions in Bagru. Tell us your
            dates and we&apos;ll craft the rest.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-gold/20 border border-gold/20 max-w-4xl mx-auto">
          {channels.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              className="group bg-ink/90 backdrop-blur-sm p-8 text-center hover:bg-ink transition-colors"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center border border-gold/40 text-gold group-hover:bg-gold group-hover:text-ink transition-colors">
                <channel.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="mt-5 text-[11px] tracking-[0.3em] uppercase text-cream-muted">
                {channel.label}
              </div>
              <div className="mt-2 font-display text-lg text-cream group-hover:text-gold transition-colors break-words">
                {channel.value}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs tracking-[0.25em] uppercase text-cream-muted text-center">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-gold flex-shrink-0" />
            {address}
          </span>
          <span className="hidden sm:block h-3 w-px bg-gold/30" />
          <span>
            Check-in {checkIn} · Check-out {checkOut}
          </span>
        </div>
      </div>
    </section>
  );
}
