import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listReservations } from "@/lib/api/reservations.functions";
import { useReservations } from "@/hooks/useReservations";
import { useSortableTable } from "@/hooks/useSortableTable";
import { useHotelStore } from "@/store/hotelStore";
import { RES_STATUS_COLORS, ROOM_TYPE_NAMES } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReservationSource, ReservationStatus } from "@/lib/types";

export const Route = createFileRoute("/dashboard/reservations")({
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    const result = await listReservations({
      data: { hotelId: hotel.id, page: 0, pageSize: 200 },
    });
    return { reservations: result.reservations };
  },
  component: ReservationsPage,
});

const STATUS_FILTERS: (ReservationStatus | "ALL")[] = [
  "ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW",
];
const SOURCE_FILTERS: (ReservationSource | "ALL")[] = [
  "ALL", "DIRECT", "BOOKING_COM", "AIRBNB", "EXPEDIA", "PHONE", "WALKIN",
];
const PAGE_SIZE = 10;

function ReservationsPage() {
  const { selectedHotel: hotel } = useHotelStore();
  const loaderData = Route.useLoaderData();
  const { reservations, filters, setFilters } = useReservations(loaderData.reservations);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(
    reservations,
    {
      code: (r) => r.code,
      guest: (r) => r.guestName,
      checkIn: (r) => r.checkIn,
      amount: (r) => r.totalAmount,
    },
    "checkIn",
  );

  const paged = useMemo(() => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [sorted, page]);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const SortTh = ({ k, label }: { k: string; label: string }) => (
    <th className="cursor-pointer px-4 py-3 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <ModuleErrorBoundary module="Reservations">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={filters.query}
              onChange={(e) => { setFilters({ ...filters, query: e.target.value }); setPage(0); }}
              placeholder="Search by guest or booking code"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value as ReservationStatus | "ALL" }); setPage(0); }}
            className="rounded-md border bg-card px-3 py-2 text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace("_", " ")}</option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => { setFilters({ ...filters, source: e.target.value as ReservationSource | "ALL" }); setPage(0); }}
            className="rounded-md border bg-card px-3 py-2 text-sm"
          >
            {SOURCE_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All sources" : s.replace("_", " ")}</option>
            ))}
          </select>
          <select
            value={filters.roomType}
            onChange={(e) => { setFilters({ ...filters, roomType: e.target.value }); setPage(0); }}
            className="rounded-md border bg-card px-3 py-2 text-sm"
          >
            <option value="ALL">All room types</option>
            {ROOM_TYPE_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            <Plus className="h-4 w-4" /> New Reservation
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <SortTh k="code" label="Booking" />
                  <SortTh k="guest" label="Guest" />
                  <th className="px-4 py-3">Room</th>
                  <SortTh k="checkIn" label="Check-in" />
                  <th className="px-4 py-3">Check-out</th>
                  <th className="px-4 py-3">Nights</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <SortTh k="amount" label="Amount" />
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paged.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 font-medium">{r.guestName}</td>
                    <td className="px-4 py-3">
                      <div>{r.roomNumber}</div>
                      <div className="text-xs text-muted-foreground">{r.roomType}</div>
                    </td>
                    <td className="px-4 py-3">{formatDate(r.checkIn)}</td>
                    <td className="px-4 py-3">{formatDate(r.checkOut)}</td>
                    <td className="px-4 py-3">{r.nights}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">{r.source.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RES_STATUS_COLORS[r.status]}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.totalAmount, hotel.currency)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/dashboard/reservations/$id"
                        params={{ id: r.id }}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "var(--hotel-primary)" }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-muted-foreground">
                      No reservations match your filters.
                      <button onClick={() => setFormOpen(true)} className="mt-2 block w-full text-sm font-semibold hover:underline" style={{ color: "var(--hotel-primary)" }}>
                        Create first reservation
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border p-1 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border p-1 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">New Reservation</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ReservationForm
              hotel={hotel}
              onSubmit={() => setFormOpen(false)}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
