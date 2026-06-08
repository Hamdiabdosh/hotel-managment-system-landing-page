import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Star } from "lucide-react";
import type { HotelConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LandingNavbar({ hotel }: { hotel: HotelConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Rooms", href: "#rooms" },
    { label: "Amenities", href: "#amenities" },
    { label: "Gallery", href: "#gallery" },
    { label: "Location", href: "#location" },
    { label: "Offers", href: "#offers" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-md shadow-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to="/$hotel"
          params={{ hotel: hotel.slug }}
          className={cn(
            "flex items-center gap-2 font-serif text-xl font-bold tracking-tight",
            scrolled ? "text-foreground" : "text-white",
          )}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
            style={{ backgroundColor: "var(--hotel-accent)", color: "var(--hotel-primary)" }}
          >
            {hotel.logo}
          </span>
          <span>{hotel.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={cn(
                "text-sm font-medium tracking-wide transition-colors",
                scrolled ? "text-foreground/80 hover:text-foreground" : "text-white/90 hover:text-white",
              )}
            >
              {l.label}
            </a>
          ))}
          {Array.from({ length: hotel.starRating }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-3.5 w-3.5 fill-current", scrolled ? "text-amber-500" : "text-white/80")}
            />
          )).slice(0, 1)}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/$hotel/book", params: { hotel: hotel.slug } })}
            className="hidden rounded-md px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03] md:block"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            Book Now
          </button>
          <button
            className={cn("md:hidden", scrolled ? "text-foreground" : "text-white")}
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="py-2 text-sm font-medium" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link
              to="/$hotel/book"
              params={{ hotel: hotel.slug }}
              className="rounded-md px-4 py-2.5 text-center text-sm font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
