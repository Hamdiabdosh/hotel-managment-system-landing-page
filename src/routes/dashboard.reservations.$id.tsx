import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import {
  getReservation,
  updateReservation,
  updateReservationStatus,
} from "@/lib/api/reservations.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { VALID_STATUS_TRANSITIONS } from "@/lib/api/reservations.queries";
import {
  RES_STATUS_COLORS,
  MOCK_FOLIOS,
  MOCK_GUESTS,
  MOCK_RESERVATIONS,
  MOCK_ROOMS,
} from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency, formatDate, nightsBetween } from "@/lib/format";
import type { ReservationStatus } from "@/lib/types";

const editSchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.coerce.number().int().min(1).max(10),
    children: z.coerce.number().int().min(0).max(10),
    specialRequests: z.string().optional(),
  })
  .refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

type EditFormData = z.infer<typeof editSchema>;

const NON_EDITABLE_STATUSES = new Set<ReservationStatus>(["CHECKED_OUT", "CANCELLED", "NO_SHOW"]);

export const Route = createFileRoute("/dashboard/reservations/$id")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/reservations")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async ({ params }) => {
    try {
      return await getReservation({ data: { id: params.id } });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[dev] DB unavailable, falling back to mock data:", error);
        const reservation = MOCK_RESERVATIONS.find((r) => r.id === params.id);
        if (!reservation) throw notFound();
        const guest = MOCK_GUESTS.find((g) => g.id === reservation.guestId);
        const folio = MOCK_FOLIOS.find((f) => f.reservationId === reservation.id);
        const mockRoom = MOCK_ROOMS.find((r) => r.id === reservation.roomId);
        return {
          reservation,
          guest,
          folio,
          roomPricePerNight:
            mockRoom?.pricePerNight ?? reservation.totalAmount / reservation.nights,
        };
      }
      throw error;
    }
  },
  component: ReservationDetailPage,
});

function ReservationDetailPage() {
  const { reservation, guest, folio, roomPricePerNight } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const hotel = useHotelStore((s) => s.selectedHotel);
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canEdit = can("updateReservationStatus") && !NON_EDITABLE_STATUSES.has(reservation.status);

  const nextStatuses = (VALID_STATUS_TRANSITIONS[reservation.status] ?? []).filter((status) => {
    if (status === "CANCELLED") return can("cancelReservation");
    return can("updateReservationStatus");
  });

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
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${RES_STATUS_COLORS[reservation.status]}`}
          >
            {reservation.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">Booking Details</h3>
              {canEdit && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <ReservationEditForm
                reservation={reservation}
                roomPricePerNight={roomPricePerNight}
                currency={hotel.currency}
                saving={saving}
                error={editError}
                onCancel={() => {
                  setEditing(false);
                  setEditError(null);
                }}
                onSave={async (data) => {
                  setSaving(true);
                  setEditError(null);
                  try {
                    await updateReservation({
                      data: {
                        id: reservation.id,
                        ...data,
                      },
                    });
                    setEditing(false);
                    await router.invalidate();
                  } catch (err) {
                    setEditError(err instanceof Error ? err.message : "Failed to save changes");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            ) : (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Room</dt>
                    <dd className="font-medium">
                      {reservation.roomNumber} — {reservation.roomType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Nights</dt>
                    <dd className="font-medium">{reservation.nights}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Check-in</dt>
                    <dd className="font-medium">{formatDate(reservation.checkIn)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Check-out</dt>
                    <dd className="font-medium">{formatDate(reservation.checkOut)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Guests</dt>
                    <dd className="font-medium">
                      {reservation.adults} adults, {reservation.children} children
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Source</dt>
                    <dd className="font-medium">{reservation.source.replace("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Total</dt>
                    <dd className="font-medium">
                      {formatCurrency(reservation.totalAmount, hotel.currency)}
                    </dd>
                  </div>
                </dl>
                {reservation.specialRequests && (
                  <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <strong>Requests:</strong> {reservation.specialRequests}
                  </p>
                )}
              </>
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
                          : {
                              backgroundColor: "var(--hotel-primary)",
                              color: "var(--hotel-accent)",
                            }
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
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>{guest.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd>{guest.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nationality</dt>
                  <dd>{guest.nationality}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Loyalty</dt>
                  <dd>
                    {guest.loyaltyTier} · {guest.loyaltyPoints} pts
                  </dd>
                </div>
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
              {folio.items.length} line items · Balance:{" "}
              {formatCurrency(folio.totalAmount - folio.paidAmount, hotel.currency)}
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

function ReservationEditForm({
  reservation,
  roomPricePerNight,
  currency,
  saving,
  error,
  onCancel,
  onSave,
}: {
  reservation: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    specialRequests?: string;
  };
  roomPricePerNight: number;
  currency: string;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (data: EditFormData) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      adults: reservation.adults,
      children: reservation.children,
      specialRequests: reservation.specialRequests ?? "",
    },
  });

  const checkIn = watch("checkIn");
  const checkOut = watch("checkOut");
  const previewNights =
    checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
      ? nightsBetween(checkIn, checkOut)
      : 0;
  const previewTotal = previewNights * roomPricePerNight;

  return (
    <form onSubmit={handleSubmit(onSave)} className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Check-in</label>
          <input
            type="date"
            {...register("checkIn")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {errors.checkIn && <p className="mt-1 text-xs text-rose-600">{errors.checkIn.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Check-out</label>
          <input
            type="date"
            {...register("checkOut")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {errors.checkOut && (
            <p className="mt-1 text-xs text-rose-600">{errors.checkOut.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Adults</label>
          <input
            type="number"
            min={1}
            max={10}
            {...register("adults")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {errors.adults && <p className="mt-1 text-xs text-rose-600">{errors.adults.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Children</label>
          <input
            type="number"
            min={0}
            max={10}
            {...register("children")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {errors.children && (
            <p className="mt-1 text-xs text-rose-600">{errors.children.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Special requests</label>
        <textarea
          {...register("specialRequests")}
          rows={2}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {previewNights > 0 && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          New total: <strong>{formatCurrency(previewTotal, currency)}</strong> (
          {formatCurrency(roomPricePerNight, currency)}/night × {previewNights} night
          {previewNights === 1 ? "" : "s"})
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel edit
        </button>
      </div>
    </form>
  );
}
