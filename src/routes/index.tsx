import { createFileRoute, Link } from "@tanstack/react-router";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { ArrowRight, LayoutDashboard, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atrium HMS — Hospitality Platform" },
      {
        name: "description",
        content: "Multi-tenant hotel management with a white-label guest experience and a powerful staff dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-center justify-between">
          <div className="font-serif text-2xl font-bold tracking-tight">Atrium HMS</div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <LayoutDashboard className="h-4 w-4" /> Open dashboard
          </Link>
        </div>

        <div className="mt-20 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Demo</div>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight md:text-6xl">
            One platform. Every hotel, in its own voice.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Each property gets a fully white-labeled landing page driven by its own brand config, while staff manage
            reservations, rooms, and revenue from a unified dashboard.
          </p>
        </div>

        <div className="mt-16">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pick a demo property</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {HOTEL_LIST.map((h) => (
              <Link
                key={h.slug}
                to="/$hotel"
                params={{ hotel: h.slug }}
                className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={h.coverImage}
                    alt={h.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: h.starRating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-500" />
                    ))}
                  </div>
                  <h3 className="mt-2 font-serif text-2xl font-semibold">{h.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{h.tagline}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                    View landing page <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
