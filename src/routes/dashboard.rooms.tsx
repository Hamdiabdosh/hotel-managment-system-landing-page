import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { RoomCard } from "@/components/rooms/RoomCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { updateRoomStatus } from "@/lib/api/front-desk.functions";
import { listRoomsForHotel } from "@/lib/api/rooms.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_HOUSEKEEPING, MOCK_ROOMS, ROOM_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import type { Room, RoomStatus } from "@/lib/types";

export const Route = createFileRoute("/dashboard/rooms")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/rooms")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      return await listRoomsForHotel({ data: { hotelId: hotel.id } });
    } catch {
      return { rooms: MOCK_ROOMS, activeStays: [], housekeepingTasks: MOCK_HOUSEKEEPING };
    }
  },
  component: RoomsPage,
});

const STATUSES: (RoomStatus | "ALL")[] = [
  "ALL", "AVAILABLE", "OCCUPIED", "CLEANING", "INSPECTING", "MAINTENANCE", "OUT_OF_ORDER",
];

function RoomsPage() {
  const { selectedHotel: hotel } = useHotelStore();
  const { rooms, activeStays, housekeepingTasks } = Route.useLoaderData();
  const router = useRouter();

  const floors = useMemo(
    () => ["ALL", ...Array.from(new Set(rooms.map((r) => String(r.floor)))).sort()],
    [rooms],
  );
  const types = useMemo(
    () => ["ALL", ...Array.from(new Set(rooms.map((r) => r.typeName))).sort()],
    [rooms],
  );

  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selected, setSelected] = useState<Room | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, RoomStatus>>({});

  const filteredRooms = rooms.filter((r) => {
    const status = statusOverrides[r.id] ?? r.status;
    if (statusFilter !== "ALL" && status !== statusFilter) return false;
    if (floorFilter !== "ALL" && r.floor !== Number(floorFilter)) return false;
    if (typeFilter !== "ALL" && r.typeName !== typeFilter) return false;
    return true;
  });

  const currentStay = selected
    ? activeStays.find((s) => s.roomId === selected.id)
    : undefined;
  const roomHistory = selected
    ? housekeepingTasks.filter((t) => t.roomId === selected.id).slice(0, 5)
    : [];

  const handleStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    const previous = statusOverrides[roomId] ?? rooms.find((r) => r.id === roomId)?.status;
    setStatusOverrides((prev) => ({ ...prev, [roomId]: newStatus }));
    setSelected((prev) => (prev?.id === roomId ? { ...prev, status: newStatus } : prev));

    try {
      await updateRoomStatus({
        data: { roomId, hotelId: hotel.id, status: newStatus },
      });
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      router.invalidate();
    } catch (err) {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        if (previous) next[roomId] = previous;
        else delete next[roomId];
        return next;
      });
      setSelected((prev) =>
        prev?.id === roomId && previous ? { ...prev, status: previous } : prev,
      );
      console.warn("[rooms] status update failed:", err);
    }
  };

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
            {floors.map((f) => <option key={f} value={f}>{f === "ALL" ? "All floors" : `Floor ${f}`}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border bg-card px-3 py-1.5 text-xs">
            {types.map((t) => <option key={t} value={t}>{t === "ALL" ? "All types" : t}</option>)}
          </select>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="rounded-2xl border bg-card px-8 py-16 text-center text-muted-foreground">
            No rooms match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {filteredRooms.map((r) => {
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

                {currentStay ? (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold">Current Guest</h4>
                    <p className="mt-1 text-sm">{currentStay.guestName}</p>
                    <p className="text-xs text-muted-foreground">Until {currentStay.checkOut}</p>
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
                        onClick={() => handleStatusChange(selected.id, s)}
                        className={`rounded-full border px-2 py-1 text-[11px] ${selected.status === s ? "bg-foreground text-background" : "hover:bg-muted"}`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">Housekeeping History</h4>
                  {roomHistory.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {roomHistory.map((t) => (
                        <li key={t.id}>
                          {t.type.replace("_", " ")} — {t.status.replace("_", " ")} · {t.assignedTo}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No housekeeping history.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
