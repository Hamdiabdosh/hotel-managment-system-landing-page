import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { HotelConfig } from "@/lib/types";
import { MOCK_GUESTS, MOCK_ROOMS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

const schema = z
  .object({
    guestId: z.string().min(1, "Select a guest"),
    roomId: z.string().min(1, "Select a room"),
    checkIn: z.string().min(1, "Check-in required"),
    checkOut: z.string().min(1, "Check-out required"),
    adults: z.coerce.number().min(1, "At least 1 adult"),
    children: z.coerce.number().min(0),
    source: z.enum(["DIRECT", "BOOKING_COM", "AIRBNB", "EXPEDIA", "PHONE", "WALKIN"]),
    specialRequests: z.string().optional(),
  })
  .refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  hotel: HotelConfig;
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
}

export function ReservationForm({ hotel, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      adults: 2,
      children: 0,
      source: "DIRECT",
      checkIn: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    },
  });

  const roomId = watch("roomId");
  const room = MOCK_ROOMS.find((r) => r.id === roomId);

  return (
    <form onSubmit={handleSubmit((d) => onSubmit?.(d))} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Guest</label>
        <select {...register("guestId")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">Select guest…</option>
          {MOCK_GUESTS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.firstName} {g.lastName}
            </option>
          ))}
        </select>
        {errors.guestId && <p className="mt-1 text-xs text-rose-600">{errors.guestId.message}</p>}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Room</label>
        <select {...register("roomId")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">Select room…</option>
          {MOCK_ROOMS.filter((r) => r.status === "AVAILABLE").map((r) => (
            <option key={r.id} value={r.id}>
              {r.number} — {r.typeName} ({formatCurrency(r.pricePerNight, hotel.currency)}/n)
            </option>
          ))}
        </select>
        {errors.roomId && <p className="mt-1 text-xs text-rose-600">{errors.roomId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Check-in</label>
          <input type="date" {...register("checkIn")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {errors.checkIn && <p className="mt-1 text-xs text-rose-600">{errors.checkIn.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Check-out</label>
          <input type="date" {...register("checkOut")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {errors.checkOut && <p className="mt-1 text-xs text-rose-600">{errors.checkOut.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Adults</label>
          <input type="number" min={1} {...register("adults")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Children</label>
          <input type="number" min={0} {...register("children")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Source</label>
        <select {...register("source")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
          {(["DIRECT", "BOOKING_COM", "AIRBNB", "EXPEDIA", "PHONE", "WALKIN"] as const).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Special requests</label>
        <textarea {...register("specialRequests")} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>

      {room && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          Est. rate: <strong>{formatCurrency(room.pricePerNight, hotel.currency)}</strong> / night
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 rounded-md px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          Create Reservation
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
