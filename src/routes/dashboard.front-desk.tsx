import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, LogIn, LogOut, FileText, MessageSquare } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { checkIn, checkOut, getFrontDeskData } from "@/lib/api/front-desk.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency } from "@/lib/format";
import type { HotelConfig, Reservation } from "@/lib/types";

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
    } catch {
      return { arrivals: [], departures: [] };
    }
  },
  component: FrontDeskPage,
});

function FrontDeskPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { arrivals, departures } = Route.useLoaderData();
  const router = useRouter();
  const [walkInOpen, setWalkInOpen] = useState(false);

  return (
    <ModuleErrorBoundary module="Front Desk">
      <div className="space-y-5">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            <Plus className="h-4 w-4" /> Walk-in Booking
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Column title="Arrivals" subtitle={`${arrivals.length} expected today`} accent="emerald">
            {arrivals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No arrivals today.</p>
            ) : (
              arrivals.map((r) => (
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
          <Column title="Departures" subtitle={`${departures.length} checking out`} accent="sky">
            {departures.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No departures today.</p>
            ) : (
              departures.map((r) => (
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

  const isCheckIn = mode === "check-in";
  const PrimaryIcon = isCheckIn ? LogIn : LogOut;
  const label = isCheckIn ? "Check In" : "Check Out";
  const loadingLabel = isCheckIn ? "Checking in…" : "Checking out…";

  const handlePrimary = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isCheckIn) {
        await checkIn({ data: { reservationId: r.id, hotelId: hotel.id } });
      } else {
        await checkOut({ data: { reservationId: r.id, hotelId: hotel.id } });
      }
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{r.guestName}</div>
          <div className="text-xs text-muted-foreground">
            Room {r.roomNumber} · {r.roomType} · {r.nights}n
          </div>
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
        <button
          onClick={handlePrimary}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          <PrimaryIcon className="h-3.5 w-3.5" /> {loading ? loadingLabel : label}
        </button>
        <button
          onClick={() => navigate({ to: "/dashboard/billing", search: { folioId: r.id } })}
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <FileText className="h-3.5 w-3.5" /> Folio
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
