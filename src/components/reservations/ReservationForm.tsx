import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createReservation } from "@/lib/api/reservations.functions";
import { createGuest, searchGuests } from "@/lib/api/guests.functions";
import type { HotelConfig } from "@/lib/types";
import { MOCK_ROOMS } from "@/lib/mock-data";
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

type GuestResult = { id: string; firstName: string; lastName: string; email: string };

interface Props {
  hotel: HotelConfig;
  onSubmit?: () => void;
  onCancel?: () => void;
}

export function ReservationForm({ hotel, onSubmit, onCancel }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<GuestResult[]>([]);
  const [guestSearching, setGuestSearching] = useState(false);
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestResult | null>(null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
  });
  const guestBoxRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
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

  useEffect(() => {
    if (guestQuery.length < 1) {
      setGuestResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setGuestSearching(true);
      try {
        const results = await searchGuests({ data: { hotelId: hotel.id, query: guestQuery } });
        setGuestResults(results);
        setGuestDropdownOpen(true);
      } catch {
        setGuestResults([]);
      } finally {
        setGuestSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [guestQuery, hotel.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (guestBoxRef.current && !guestBoxRef.current.contains(e.target as Node)) {
        setGuestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectGuest = (guest: GuestResult) => {
    setSelectedGuest(guest);
    setValue("guestId", guest.id, { shouldValidate: true });
    setGuestQuery(`${guest.firstName} ${guest.lastName}`);
    setGuestDropdownOpen(false);
    setCreatingGuest(false);
  };

  const handleCreateGuest = async () => {
    if (
      !newGuest.firstName ||
      !newGuest.lastName ||
      !newGuest.email ||
      !newGuest.phone ||
      !newGuest.nationality
    ) {
      setError("root", { message: "Fill in all guest fields" });
      return;
    }
    try {
      const created = await createGuest({
        data: { ...newGuest, hotelId: hotel.id },
      });
      selectGuest({
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
      });
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to create guest",
      });
    }
  };

  const onFormSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await createReservation({
        data: {
          ...data,
          hotelId: hotel.id,
          depositAmount: 0,
        },
      });
      onSubmit?.();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to create reservation",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div ref={guestBoxRef} className="relative">
        <label className="text-xs font-medium text-muted-foreground">Guest</label>
        <input
          type="text"
          value={guestQuery}
          onChange={(e) => {
            setGuestQuery(e.target.value);
            if (
              selectedGuest &&
              e.target.value !== `${selectedGuest.firstName} ${selectedGuest.lastName}`
            ) {
              setSelectedGuest(null);
              setValue("guestId", "");
            }
          }}
          onFocus={() => guestQuery.length >= 1 && setGuestDropdownOpen(true)}
          placeholder="Search by name or email…"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input type="hidden" {...register("guestId")} />
        {guestDropdownOpen && guestQuery.length >= 1 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {guestSearching && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            )}
            {!guestSearching && guestResults.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No guests found.</p>
            )}
            {guestResults.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGuest(g)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">
                  {g.firstName} {g.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{g.email}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCreatingGuest(true);
                setGuestDropdownOpen(false);
              }}
              className="w-full border-t px-3 py-2 text-left text-xs font-semibold hover:bg-muted"
              style={{ color: "var(--hotel-primary)" }}
            >
              + New guest
            </button>
          </div>
        )}
        {errors.guestId && <p className="mt-1 text-xs text-rose-600">{errors.guestId.message}</p>}
      </div>

      {creatingGuest && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-semibold">New guest</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="First name"
              value={newGuest.firstName}
              onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Last name"
              value={newGuest.lastName}
              onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <input
            placeholder="Email"
            type="email"
            value={newGuest.email}
            onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Phone"
            value={newGuest.phone}
            onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Nationality"
            value={newGuest.nationality}
            onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateGuest}
              className="rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              Save guest
            </button>
            <button
              type="button"
              onClick={() => setCreatingGuest(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Room</label>
        <select
          {...register("roomId")}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
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
            {...register("adults")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Children</label>
          <input
            type="number"
            min={0}
            {...register("children")}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Source</label>
        <select
          {...register("source")}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {(["DIRECT", "BOOKING_COM", "AIRBNB", "EXPEDIA", "PHONE", "WALKIN"] as const).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Special requests</label>
        <textarea
          {...register("specialRequests")}
          rows={2}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      {room && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          Est. rate: <strong>{formatCurrency(room.pricePerNight, hotel.currency)}</strong> / night
        </div>
      )}

      {errors.root && <p className="text-sm text-rose-600">{errors.root.message}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          {isSubmitting ? "Creating…" : "Create Reservation"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
