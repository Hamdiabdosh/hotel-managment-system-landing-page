import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { RoomCard } from "@/components/rooms/RoomCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_GUESTS, MOCK_RESERVATIONS, MOCK_ROOMS, ROOM_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import type { Room, RoomStatus } from "@/lib/types";

export const Route = createFileRoute("/dashboard/rooms")({
  component: RoomsPage,
});

const STATUSES: (RoomStatus | "ALL")[] = [
  "ALL", "AVAILABLE", "OCCUPIED", "CLEANING", "INSPECTING", "MAINTENANCE", "OUT_OF_ORDER",
];
const FLOORS = ["ALL", "2", "3", "4"];
const TYPES = ["ALL", "Deluxe Room", "Executive Suite", "Presidential Suite"];

function RoomsPage() {
  const { selectedHotel: hotel } = useHotelStore();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selected, setSelected] = useState<Room | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, RoomStatus>>({});

  const rooms = MOCK_ROOMS.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (floorFilter !== "ALL" && r.floor !== Number(floorFilter)) return false;
    if (typeFilter !== "ALL" && r.typeName !== typeFilter) return false;
    return true;
  });

  const currentGuest = selected
    ? MOCK_RESERVATIONS.find((r) => r.roomId === selected.id && r.status === "CHECKED_IN")
    : undefined;
  const guestProfile = currentGuest ? MOCK_GUESTS.find((g) => g.id === currentGuest.guestId) : undefined;

  return (
    <ModuleErrorBoundary module="Rooms">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-foreground text-background" : "bg-card hover:bg-muted"
              }`}
            >
              {s === "ALL" ? "All statuses" : s.replace("_", " ")}
            </button>
          ))}
          <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="rounded-md border bg-card px-3 py-1.5 text-xs">
            {FLOORS.map((f) => <option key={f} value={f}>{f === "ALL" ? "All floors" : `Floor ${f}`}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border bg-card px-3 py-1.5 text-xs">
            {TYPES.map((t) => <option key={t} value={t}>{t === "ALL" ? "All types" : t}</option>)}
          </select>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-2xl border bg-card px-8 py-16 text-center text-muted-foreground">
            No rooms match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {rooms.map((r) => {
              const room = statusOverrides[r.id] ? { ...r, status: statusOverrides[r.id]! } : r;
              return <RoomCard key={r.id} room={room} currency={hotel.currency} onClick={() => setSelected(room)} />;
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif">Room {selected.number}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${ROOM_STATUS_COLORS[selected.status]}`}>
                  {selected.status.replace("_", " ")}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Type</dt><dd className="font-medium">{selected.typeName}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Floor</dt><dd className="font-medium">{selected.floor}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Rate</dt><dd className="font-medium">{formatCurrency(selected.pricePerNight, hotel.currency)}/n</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Max guests</dt><dd className="font-medium">{selected.maxOccupancy}</dd></div>
                </dl>

                {currentGuest && guestProfile ? (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold">Current Guest</h4>
                    <p className="mt-1 text-sm">{guestProfile.firstName} {guestProfile.lastName}</p>
                    <p className="text-xs text-muted-foreground">Until {currentGuest.checkOut}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No guest currently assigned.</p>
                )}

                <div>
                  <h4 className="text-sm font-semibold">Quick Status Change</h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] as RoomStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusOverrides((prev) => ({ ...prev, [selected.id]: s }));
                          setSelected({ ...selected, status: s });
                        }}
                        className={`rounded-full border px-2 py-1 text-[11px] ${selected.status === s ? "bg-foreground text-background" : "hover:bg-muted"}`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Housekeeping History</h4>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>Today — Standard clean completed</li>
                    <li>Yesterday — Turndown service</li>
                    <li>3 days ago — Deep clean</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
