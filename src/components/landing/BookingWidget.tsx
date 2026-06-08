import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Users, BedDouble, Search } from "lucide-react";
import type { HotelConfig } from "@/lib/types";
import { formatCurrency, nightsBetween } from "@/lib/format";

interface Props {
  hotel: HotelConfig;
  variant?: "hero" | "panel";
}

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function BookingWidget({ hotel, variant = "hero" }: Props) {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(3));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomTypeId, setRoomTypeId] = useState(hotel.roomTypes[0]!.id);

  const nights = nightsBetween(checkIn, checkOut);
  const room = hotel.roomTypes.find((r) => r.id === roomTypeId) ?? hotel.roomTypes[0]!;
  const total = useMemo(() => nights * room.pricePerNight, [nights, room]);

  const invalid = new Date(checkOut) <= new Date(checkIn) || new Date(checkIn) < new Date(todayISO(0));

  const onSearch = () => {
    if (invalid) return;
    navigate({ to: "/$hotel/book", params: { hotel: hotel.slug } });
  };

  const isHero = variant === "hero";

  return (
    <div
      className={
        isHero
          ? "mx-auto w-full max-w-5xl rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur md:p-6"
          : "w-full rounded-2xl border bg-card p-6 shadow-sm"
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <Field icon={<CalendarDays className="h-4 w-4" />} label="Check-in" className="md:col-span-3">
          <input
            type="date"
            value={checkIn}
            min={todayISO(0)}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none"
          />
        </Field>
        <Field icon={<CalendarDays className="h-4 w-4" />} label="Check-out" className="md:col-span-3">
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none"
          />
        </Field>
        <Field icon={<Users className="h-4 w-4" />} label="Guests" className="md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="bg-transparent outline-none"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} adult{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">·</span>
            <select
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="bg-transparent outline-none"
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n} child{n === 1 ? "" : "ren"}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field icon={<BedDouble className="h-4 w-4" />} label="Room type" className="md:col-span-2">
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none"
          >
            {hotel.roomTypes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={onSearch}
          disabled={invalid}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50 md:col-span-2"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span className="text-muted-foreground">
          {invalid ? "Pick valid dates" : `${nights} night${nights > 1 ? "s" : ""} · ${room.name}`}
        </span>
        <span className="font-serif text-lg font-semibold" style={{ color: "var(--hotel-primary)" }}>
          {invalid ? "—" : `${formatCurrency(total, hotel.currency)} total`}
        </span>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-background/60 px-4 py-3 ${className ?? ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
