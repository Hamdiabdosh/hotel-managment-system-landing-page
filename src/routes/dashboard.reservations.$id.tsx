import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { MOCK_FOLIOS, MOCK_GUESTS, MOCK_RESERVATIONS, RES_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/reservations/$id")({
  loader: ({ params }) => {
    const reservation = MOCK_RESERVATIONS.find((r) => r.id === params.id);
    if (!reservation) throw notFound();
    const guest = MOCK_GUESTS.find((g) => g.id === reservation.guestId);
    const folio = MOCK_FOLIOS.find((f) => f.reservationId === reservation.id);
    return { reservation, guest, folio };
  },
  component: ReservationDetailPage,
});

function ReservationDetailPage() {
  const { reservation, guest, folio } = Route.useLoaderData();
  const hotel = HOTEL_LIST[0]!;

  return (
    <ModuleErrorBoundary module="Reservation Detail">
      <div className="space-y-6">
        <Link
          to="/dashboard/reservations"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to reservations
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold">{reservation.code}</h2>
            <p className="text-muted-foreground">{reservation.guestName}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${RES_STATUS_COLORS[reservation.status]}`}>
            {reservation.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Booking Details</h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Room</dt><dd className="font-medium">{reservation.roomNumber} — {reservation.roomType}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Nights</dt><dd className="font-medium">{reservation.nights}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Check-in</dt><dd className="font-medium">{formatDate(reservation.checkIn)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Check-out</dt><dd className="font-medium">{formatDate(reservation.checkOut)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Guests</dt><dd className="font-medium">{reservation.adults} adults, {reservation.children} children</dd></div>
              <div><dt className="text-xs text-muted-foreground">Source</dt><dd className="font-medium">{reservation.source.replace("_", " ")}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-medium">{formatCurrency(reservation.totalAmount, hotel.currency)}</dd></div>
            </dl>
            {reservation.specialRequests && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <strong>Requests:</strong> {reservation.specialRequests}
              </p>
            )}
          </div>

          {guest && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="font-serif text-lg font-semibold">Guest</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">Email</dt><dd>{guest.email}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{guest.phone}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Nationality</dt><dd>{guest.nationality}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Loyalty</dt><dd>{guest.loyaltyTier} · {guest.loyaltyPoints} pts</dd></div>
              </dl>
              <Link
                to="/dashboard/guests/$id"
                params={{ id: guest.id }}
                className="mt-4 inline-block text-sm font-semibold hover:underline"
                style={{ color: "var(--hotel-primary)" }}
              >
                View full profile →
              </Link>
            </div>
          )}
        </div>

        {folio && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Folio Summary</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {folio.items.length} line items · Balance: {formatCurrency(folio.totalAmount - folio.paidAmount, hotel.currency)}
            </p>
            <Link
              to="/dashboard/billing"
              className="mt-3 inline-block text-sm font-semibold hover:underline"
              style={{ color: "var(--hotel-primary)" }}
            >
              View full folio →
            </Link>
          </div>
        )}
      </div>
    </ModuleErrorBoundary>
  );
}
