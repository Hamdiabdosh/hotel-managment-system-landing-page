import { useState } from "react";
import { Star, MapPin, Phone, Mail, ArrowRight, ChevronDown, X } from "lucide-react";
import * as Icons from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { HotelConfig } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { BookingWidget } from "./BookingWidget";

export function Hero({ hotel }: { hotel: HotelConfig }) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${hotel.coverImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-6 pb-12 pt-32 text-white">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: hotel.starRating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" style={{ color: "var(--hotel-accent)" }} />
          ))}
        </div>
        <h1 className="mt-4 font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
          {hotel.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/85 md:text-xl">{hotel.tagline}</p>

        <div className="mt-10">
          <BookingWidget hotel={hotel} />
        </div>
      </div>

      <a
        href="#rooms"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/70 transition-colors hover:text-white"
        aria-label="Scroll to rooms"
      >
        <span className="text-[10px] uppercase tracking-widest">Explore</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}

export function RoomShowcase({ hotel }: { hotel: HotelConfig }) {
  return (
    <section id="rooms" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading kicker="Stay" title="Rooms & Suites" subtitle="Spaces designed for rest, work, and indulgence." />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {hotel.roomTypes.map((room) => (
            <article
              key={room.id}
              className="group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl font-semibold" style={{ color: "var(--hotel-primary)" }}>
                  {room.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{room.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {room.amenities.slice(0, 3).map((a) => (
                    <span
                      key={a}
                      className="rounded-full border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">From</div>
                    <div className="font-serif text-2xl font-bold" style={{ color: "var(--hotel-primary)" }}>
                      {formatCurrency(room.pricePerNight, hotel.currency)}
                      <span className="text-sm font-normal text-muted-foreground">/night</span>
                    </div>
                  </div>
                  <Link
                    to="/$hotel/book"
                    params={{ hotel: hotel.slug }}
                    className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                    style={{ color: "var(--hotel-primary)" }}
                  >
                    Book <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AmenitiesGrid({ hotel }: { hotel: HotelConfig }) {
  return (
    <section
      id="amenities"
      className="py-24"
      style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          kicker="Experience"
          title="Amenities"
          subtitle="Everything you need, thoughtfully provided."
          light
        />
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {hotel.amenities.map((a) => {
            const Icon = (Icons[a.icon as keyof typeof Icons] as React.FC<{ className?: string }>) ?? Icons.Sparkles;
            return (
              <div key={a.label} className="flex flex-col items-center text-center">
                <Icon className="h-8 w-8" />
                <span className="mt-3 text-sm font-medium tracking-wide">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Gallery({ hotel }: { hotel: HotelConfig }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <section id="gallery" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading kicker="Spaces" title="Gallery" subtitle="A glimpse into the property." />
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {hotel.gallery.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightbox(src)}
              className={`overflow-hidden rounded-xl ${i % 5 === 0 ? "row-span-2 md:row-span-2" : ""}`}
            >
              <img
                src={src}
                alt={`${hotel.name} gallery ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close gallery"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Gallery preview"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

export function Testimonials({ hotel }: { hotel: HotelConfig }) {
  return (
    <section className="bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading kicker="Voices" title="Guest Stories" />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {hotel.testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border bg-card p-8">
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current text-amber-500" />
                ))}
              </div>
              <p className="mt-4 font-serif text-lg italic leading-relaxed">"{t.quote}"</p>
              <div className="mt-6 text-sm font-semibold">— {t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Location({ hotel }: { hotel: HotelConfig }) {
  return (
    <section id="location" className="bg-background py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-2">
        <div>
          <SectionHeading kicker="Find Us" title="Location" />
          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4" style={{ color: "var(--hotel-primary)" }} />
              <span>{hotel.address}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4" style={{ color: "var(--hotel-primary)" }} />
              <span>{hotel.phone}</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4" style={{ color: "var(--hotel-primary)" }} />
              <span>{hotel.email}</span>
            </div>
          </div>
          <div className="mt-8">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Getting here</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· 15 min from international airport</li>
              <li>· 5 min walk to nearest metro / station</li>
              <li>· Complimentary valet & EV charging</li>
            </ul>
          </div>
        </div>
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <span className="font-serif text-lg">Map preview</span>
        </div>
      </div>
    </section>
  );
}

export function Offers({ hotel }: { hotel: HotelConfig }) {
  return (
    <section id="offers" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading kicker="Limited" title="Offers & Packages" />
        <div className="mt-12 flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 snap-x">
          {hotel.offers.map((o) => (
            <article
              key={o.title}
              className="snap-start min-w-[300px] max-w-sm flex-1 overflow-hidden rounded-2xl border bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={o.image} alt={o.title} className="h-full w-full object-cover" />
                <span
                  className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: "var(--hotel-accent)", color: "var(--hotel-primary)" }}
                >
                  {o.badge}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-xl font-semibold" style={{ color: "var(--hotel-primary)" }}>
                  {o.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer({ hotel }: { hotel: HotelConfig }) {
  return (
    <footer style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-4">
        <div>
          <div className="font-serif text-2xl font-bold">{hotel.name}</div>
          <p className="mt-3 text-sm opacity-80">{hotel.description}</p>
        </div>
        <FooterCol title="Visit" items={["Rooms", "Amenities", "Gallery", "Offers"]} />
        <FooterCol title="Policies" items={["Cancellation", "Privacy", "Terms", "Accessibility"]} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Contact</div>
          <div className="mt-3 space-y-2 text-sm opacity-90">
            <div>{hotel.address}</div>
            <div>{hotel.phone}</div>
            <div>{hotel.email}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs opacity-70">
        © {new Date().getFullYear()} {hotel.name}. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{title}</div>
      <ul className="mt-3 space-y-2 text-sm opacity-90">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="hover:opacity-100">
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
  light,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${light ? "opacity-70" : "text-muted-foreground"}`}>
        {kicker}
      </div>
      <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight md:text-5xl">{title}</h2>
      {subtitle && <p className={`mt-3 text-base ${light ? "opacity-80" : "text-muted-foreground"}`}>{subtitle}</p>}
    </div>
  );
}
