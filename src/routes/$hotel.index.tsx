import { createFileRoute, notFound } from "@tanstack/react-router";
import { getHotel } from "@/lib/config/hotels";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import {
  Hero,
  RoomShowcase,
  AmenitiesGrid,
  Gallery,
  Testimonials,
  Location,
  Offers,
  Footer,
} from "@/components/landing/Sections";

export const Route = createFileRoute("/$hotel/")({
  loader: ({ params }) => {
    const hotel = getHotel(params.hotel);
    if (!hotel) throw notFound();
    return { hotel };
  },
  head: ({ loaderData }) => {
    const h = loaderData?.hotel;
    if (!h) return {};
    return {
      meta: [
        { title: `${h.name} — ${h.tagline}` },
        { name: "description", content: h.description },
        { property: "og:title", content: `${h.name} — ${h.tagline}` },
        { property: "og:description", content: h.description },
        { property: "og:image", content: h.coverImage },
      ],
    };
  },
  component: HotelLanding,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold">Hotel not found</h1>
        <p className="mt-2 text-muted-foreground">This property doesn't exist in our system.</p>
      </div>
    </div>
  ),
});

function HotelLanding() {
  const { hotel } = Route.useLoaderData();
  const styleVars = {
    "--hotel-primary": hotel.theme.primaryColor,
    "--hotel-accent": hotel.theme.accentColor,
  } as React.CSSProperties;

  return (
    <div style={styleVars} className="bg-background">
      <LandingNavbar hotel={hotel} />
      <Hero hotel={hotel} />
      <RoomShowcase hotel={hotel} />
      <AmenitiesGrid hotel={hotel} />
      <Gallery hotel={hotel} />
      <Testimonials hotel={hotel} />
      <Offers hotel={hotel} />
      <Location hotel={hotel} />
      <Footer hotel={hotel} />
    </div>
  );
}
