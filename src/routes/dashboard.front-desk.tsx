import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DoorOpen, LogIn, LogOut, FileText, MessageSquare, Plus, Search } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  checkIn,
  checkOut,
  getAvailableRoomsForDate,
  getFrontDeskData,
  reassignRoom,
  updateRoomStatus,
} from "@/lib/api/front-desk.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency } from "@/lib/format";
import type { HotelConfig, Reservation, RoomStatus } from "@/lib/types";

type FrontDeskRoom = {
  id: string;
  number: string;
  status: RoomStatus;
  floor: number;
};

type AvailableRoom = {
  id: string;
  number: string;
  type: string;
  floor: number;
  pricePerNight: number;
};

const DESK_ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  OCCUPIED: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  CLEANING: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  INSPECTING: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  MAINTENANCE: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  OUT_OF_ORDER: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

const ROOM_STATUS_OPTIONS: RoomStatus[] = [
  "AVAILABLE",
  "CLEANING",
  "INSPECTING",
  "MAINTENANCE",
  "OUT_OF_ORDER",
];

export const Route = createFileRoute("/dashboard/front-desk")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/front-desk")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      return await getFrontDeskData({ data: { hotelId: hotel.id } });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[dev] DB unavailable, falling back to mock data:", error);
        return { arrivals: [], departures: [], rooms: [] };
      }
      throw error;
    }
  },
  component: FrontDeskPage,
});

function FrontDeskPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { arrivals, departures, rooms } = Route.useLoaderData();
  const router = useRouter();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = {
    arrivals: arrivals.filter(
      (r) =>
        !search ||
        r.guestName.toLowerCase().includes(search.toLowerCase()) ||
        r.roomNumber.includes(search) ||
        r.code.toLowerCase().includes(search.toLowerCase()),
    ),
    departures: departures.filter(
      (r) =>
        !search ||
        r.guestName.toLowerCase().includes(search.toLowerCase()) ||
        r.roomNumber.includes(search) ||
        r.code.toLowerCase().includes(search.toLowerCase()),
    ),
  };

  return (
    <ModuleErrorBoundary module="Front Desk">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, room, or booking code…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => setWalkInOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            <Plus className="h-4 w-4" /> Walk-in Booking
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Column
            title="Arrivals"
            subtitle={`${filtered.arrivals.length} expected today`}
            accent="emerald"
          >
            {filtered.arrivals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No arrivals today.</p>
            ) : (
              filtered.arrivals.map((r) => (
                <DeskCard
                  key={r.id}
                  r={r}
                  hotel={hotel}
                  currency={hotel.currency}
                  mode="check-in"
                />
              ))
            )}
          </Column>
          <Column
            title="Departures"
            subtitle={`${filtered.departures.length} checking out`}
            accent="sky"
          >
            {filtered.departures.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No departures today.</p>
            ) : (
              filtered.departures.map((r) => (
                <DeskCard
                  key={r.id}
                  r={r}
                  hotel={hotel}
                  currency={hotel.currency}
                  mode="check-out"
                />
              ))
            )}
          </Column>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-serif text-lg font-semibold">Room Status</h3>
            </div>
            <span className="text-xs text-muted-foreground">{rooms.length} rooms</span>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {rooms.map((room) => (
              <RoomStatusPill key={room.id} room={room} hotelId={hotel.id} />
            ))}
          </div>
        </div>
      </div>

      <Sheet open={walkInOpen} onOpenChange={setWalkInOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Walk-in Booking</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ReservationForm
              hotel={hotel}
              onSubmit={() => {
                setWalkInOpen(false);
                router.invalidate();
              }}
              onCancel={() => setWalkInOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}

function Column({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: "emerald" | "sky";
  children: React.ReactNode;
}) {
  const dot = accent === "emerald" ? "bg-emerald-500" : "bg-sky-500";
  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function RoomStatusPill({ room, hotelId }: { room: FrontDeskRoom; hotelId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: RoomStatus) => {
    setUpdating(true);
    try {
      await updateRoomStatus({ data: { roomId: room.id, hotelId, status } });
      setOpen(false);
      router.invalidate();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${DESK_ROOM_STATUS_COLORS[room.status]}`}
        >
          {room.number}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start">
        <p className="mb-2 px-1 text-[11px] text-muted-foreground">Room {room.number}</p>
        <div className="space-y-1">
          {ROOM_STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              disabled={updating || room.status === status}
              onClick={() => handleStatusChange(status)}
              className={`w-full rounded px-2 py-1.5 text-left text-xs font-medium disabled:opacity-40 ${DESK_ROOM_STATUS_COLORS[status]}`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DeskCard({
  r,
  hotel,
  currency,
  mode,
}: {
  r: Reservation;
  hotel: HotelConfig;
  currency: string;
  mode: "check-in" | "check-out";
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);

  const isCheckIn = mode === "check-in";
  const folioBalance = r.folioBalance ?? 0;
  const hasBalance = !isCheckIn && folioBalance > 0;

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await checkOut({ data: { reservationId: r.id, hotelId: hotel.id } });
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check Out failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await checkIn({ data: { reservationId: r.id, hotelId: hotel.id } });
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check In failed");
    } finally {
      setLoading(false);
    }
  };

  const goToBilling = () => navigate({ to: "/dashboard/billing", search: { folioId: r.id } });

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{r.guestName}</div>
          <div className="text-xs text-muted-foreground">
            Room {r.roomNumber} · {r.roomType} · {r.nights}n
          </div>
          {hasBalance && (
            <p className="mt-1 text-xs font-medium text-rose-600">
              Balance due: {formatCurrency(folioBalance, currency)}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatCurrency(r.totalAmount, currency)}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>
        </div>
      </div>
      {r.specialRequests && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
          <MessageSquare className="h-3 w-3" /> {r.specialRequests}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {isCheckIn ? (
          <>
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              <LogIn className="h-3.5 w-3.5" /> {loading ? "Checking in…" : "Check In"}
            </button>
            <Popover open={roomPickerOpen} onOpenChange={setRoomPickerOpen}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  <DoorOpen className="h-3.5 w-3.5" /> Change Room
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <RoomPickerList
                  reservation={r}
                  hotelId={hotel.id}
                  currency={currency}
                  open={roomPickerOpen}
                  onReassigned={() => {
                    setRoomPickerOpen(false);
                    router.invalidate();
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={goToBilling}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <FileText className="h-3.5 w-3.5" /> Folio
            </button>
          </>
        ) : hasBalance ? (
          <button
            onClick={goToBilling}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/20"
          >
            <FileText className="h-3.5 w-3.5" /> Collect Payment
          </button>
        ) : (
          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" /> {loading ? "Checking out…" : "Check Out"}
          </button>
        )}
        {!isCheckIn && (
          <button
            onClick={goToBilling}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" /> Folio
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function RoomPickerList({
  reservation,
  hotelId,
  currency,
  open,
  onReassigned,
}: {
  reservation: Reservation;
  hotelId: string;
  currency: string;
  open: boolean;
  onReassigned: () => void;
}) {
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getAvailableRoomsForDate({
      data: {
        hotelId,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        roomType: reservation.roomType,
      },
    })
      .then(setRooms)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load rooms"))
      .finally(() => setLoading(false));
  }, [open, hotelId, reservation.checkIn, reservation.checkOut, reservation.roomType]);

  const handleSelect = async (room: AvailableRoom) => {
    setReassigning(room.id);
    setError(null);
    try {
      await reassignRoom({
        data: { reservationId: reservation.id, newRoomId: room.id, hotelId },
      });
      onReassigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room reassignment failed");
    } finally {
      setReassigning(null);
    }
  };

  return (
    <div>
      <p className="border-b px-3 py-2 text-xs font-medium">Available rooms</p>
      <div className="max-h-48 overflow-y-auto p-1">
        {loading && <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>}
        {!loading && rooms.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No rooms available.</p>
        )}
        {rooms.map((room) => (
          <button
            key={room.id}
            disabled={reassigning !== null || room.id === reservation.roomId}
            onClick={() => handleSelect(room)}
            className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-muted disabled:opacity-40"
          >
            <span>
              Room {room.number} · Floor {room.floor}
              <span className="ml-1 text-muted-foreground">({room.type})</span>
            </span>
            <span className="font-medium">{formatCurrency(room.pricePerNight, currency)}/n</span>
          </button>
        ))}
      </div>
      {error && <p className="border-t px-3 py-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
