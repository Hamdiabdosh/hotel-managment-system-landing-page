import { createFileRoute } from "@tanstack/react-router";
import { Plus, LogIn, LogOut, FileText, MessageSquare } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { MOCK_RESERVATIONS } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency } from "@/lib/format";
import type { Reservation } from "@/lib/types";

export const Route = createFileRoute("/dashboard/front-desk")({
  component: FrontDeskPage,
});

function FrontDeskPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const arrivals = MOCK_RESERVATIONS.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING").slice(0, 6);
  const departures = MOCK_RESERVATIONS.filter((r) => r.status === "CHECKED_IN").slice(0, 6);

  return (
    <ModuleErrorBoundary module="Front Desk">
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          <Plus className="h-4 w-4" /> Walk-in Booking
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Column title="Arrivals" subtitle={`${arrivals.length} expected today`} accent="emerald">
          {arrivals.map((r) => (
            <DeskCard key={r.id} r={r} currency={hotel.currency} primary={{ label: "Check In", icon: LogIn }} />
          ))}
        </Column>
        <Column title="Departures" subtitle={`${departures.length} checking out`} accent="sky">
          {departures.map((r) => (
            <DeskCard key={r.id} r={r} currency={hotel.currency} primary={{ label: "Check Out", icon: LogOut }} />
          ))}
        </Column>
      </div>
    </div>
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
  currency,
  primary,
}: {
  r: Reservation;
  currency: string;
  primary: { label: string; icon: React.FC<{ className?: string }> };
}) {
  const PrimaryIcon = primary.icon;
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
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          <PrimaryIcon className="h-3.5 w-3.5" /> {primary.label}
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
          <FileText className="h-3.5 w-3.5" /> Folio
        </button>
      </div>
    </div>
  );
}
