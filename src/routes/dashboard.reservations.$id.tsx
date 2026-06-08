import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { getReservation, updateReservationStatus } from "@/lib/api/reservations.functions";
import { VALID_STATUS_TRANSITIONS } from "@/lib/api/reservations.queries";
import { RES_STATUS_COLORS } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReservationStatus } from "@/lib/types";

export const Route = createFileRoute("/dashboard/reservations/$id")({
  loader: async ({ params }) => {
    return getReservation({ data: { id: params.id } });
  },
  component: ReservationDetailPage,
});

function ReservationDetailPage() {
  const { reservation, guest, folio } = Route.useLoaderData();
  const hotel = useHotelStore((s) => s.selectedHotel);
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = VALID_STATUS_TRANSITIONS[reservation.status] ?? [];

  const handleStatusChange = async (status: ReservationStatus) => {
    setUpdating(true);
    setError(null);
    try {
      await updateReservationStatus({ data: { id: reservation.id, status } });
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

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

            {nextStatuses.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-semibold">Update Status</h4>
                {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      disabled={updating}
                      onClick={() => handleStatusChange(status)}
                      className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                      style={
                        status === "CANCELLED" || status === "NO_SHOW"
                          ? undefined
                          : { backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }
                      }
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
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
