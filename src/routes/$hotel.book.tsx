import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getHotel } from "@/lib/config/hotels";
import { BookingWidget } from "@/components/landing/BookingWidget";

export const Route = createFileRoute("/$hotel/book")({
  loader: ({ params }) => {
    const hotel = getHotel(params.hotel);
    if (!hotel) throw notFound();
    return { hotel };
  },
  head: ({ loaderData }) =>
    loaderData?.hotel
      ? {
          meta: [
            { title: `Book — ${loaderData.hotel.name}` },
            { name: "description", content: `Reserve your stay at ${loaderData.hotel.name}.` },
          ],
        }
      : {},
  component: BookPage,
});

function BookPage() {
  const { hotel } = Route.useLoaderData();
  const styleVars = {
    "--hotel-primary": hotel.theme.primaryColor,
    "--hotel-accent": hotel.theme.accentColor,
  } as React.CSSProperties;

  return (
    <div style={styleVars} className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          to="/$hotel"
          params={{ hotel: hotel.slug }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {hotel.name}
        </Link>

        <div className="mt-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight">Reserve your stay</h1>
          <p className="mt-2 text-muted-foreground">
            Best rates guaranteed when you book directly with {hotel.name}.
          </p>
        </div>

        <div className="mt-8">
          <BookingWidget hotel={hotel} variant="panel" />
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          <strong className="text-foreground">Skeleton notice:</strong> Payment processing and full booking flow are
          UI-only for now. Wire to Cloud when ready.
        </div>
      </div>
    </div>
  );
}
