import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { GuestProfileCard } from "@/components/guests/GuestProfileCard";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { MOCK_GUESTS, MOCK_RESERVATIONS } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/guests/$id")({
  loader: ({ params }) => {
    const guest = MOCK_GUESTS.find((g) => g.id === params.id);
    if (!guest) throw notFound();
    const stays = MOCK_RESERVATIONS.filter((r) => r.guestId === guest.id);
    return { guest, stays };
  },
  component: GuestProfilePage,
});

function GuestProfilePage() {
  const { guest, stays } = Route.useLoaderData();
  const hotel = HOTEL_LIST[0]!;

  return (
    <ModuleErrorBoundary module="Guest Profile">
      <div className="space-y-5">
        <Link
          to="/dashboard/guests"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to guests
        </Link>
        <GuestProfileCard guest={guest} stayHistory={stays} currency={hotel.currency} />
      </div>
    </ModuleErrorBoundary>
  );
}
