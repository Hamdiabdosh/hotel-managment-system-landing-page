import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { chargeToRoom, getActiveRooms } from "@/lib/api/pos.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_POS_ITEMS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import type { PosOrderItem } from "@/lib/types";

export const Route = createFileRoute("/dashboard/pos")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/pos")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotelId = useHotelStore.getState().selectedHotel.id;
    try {
      const activeRooms = await getActiveRooms({ data: { hotelId } });
      return { activeRooms };
    } catch (err) {
      console.warn("[pos] DB unavailable, using mock data:", err);
      return { activeRooms: [] };
    }
  },
  component: PosPage,
});

function PosPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { activeRooms } = Route.useLoaderData();
  const router = useRouter();

  const [cart, setCart] = useState<PosOrderItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [chargeOpen, setChargeOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  const categories = ["ALL", ...new Set(MOCK_POS_ITEMS.map((i) => i.category))];
  const items = category === "ALL" ? MOCK_POS_ITEMS : MOCK_POS_ITEMS.filter((i) => i.category === category);
  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const selectedRoomInfo = activeRooms.find((r) => r.roomNumber === selectedRoom);

  const addToCart = (item: (typeof MOCK_POS_ITEMS)[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.posItemId === item.id);
      if (existing) {
        return prev.map((c) => (c.posItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { posItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.posItemId === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      setChargeError("Please select a room");
      return;
    }

    setCharging(true);
    setChargeError(null);

    try {
      await chargeToRoom({
        data: {
          hotelId: hotel.id,
          roomNumber: selectedRoom,
          items: cart,
          staffNote: staffNote.trim() || undefined,
        },
      });
      toast.success(`Charged ${formatCurrency(total, hotel.currency)} to room ${selectedRoom}`);
      setCart([]);
      setSelectedRoom("");
      setStaffNote("");
      setChargeOpen(false);
      router.invalidate();
    } catch (err) {
      setChargeError(err instanceof Error ? err.message : "Failed to charge room");
    } finally {
      setCharging(false);
    }
  };

  return (
    <ModuleErrorBoundary module="POS">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  category === c ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.category}</div>
                <div className="mt-2 font-semibold">{formatCurrency(item.price, hotel.currency)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="font-serif text-lg font-semibold">Current Order</h3>
          </div>
          {cart.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">Tap items to add to order.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cart.map((c) => (
                <li key={c.posItemId} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(c.posItemId, -1)} className="rounded border p-0.5"><Minus className="h-3 w-3" /></button>
                    <span className="w-4 text-center">{c.quantity}</span>
                    <button onClick={() => updateQty(c.posItemId, 1)} className="rounded border p-0.5"><Plus className="h-3 w-3" /></button>
                    <span className="w-16 text-right font-semibold">{formatCurrency(c.price * c.quantity, hotel.currency)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total, hotel.currency)}</span>
            </div>
            <button
              disabled={cart.length === 0}
              className="mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
              onClick={() => {
                setChargeOpen(true);
                setChargeError(null);
              }}
            >
              Charge to Room
            </button>
            <button
              onClick={() => setCart([])}
              className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Clear order
            </button>
          </div>
        </div>
      </div>

      <Sheet open={chargeOpen} onOpenChange={setChargeOpen}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="font-serif">Charge to Room</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCharge} className="mt-6 space-y-4">
            <div>
              <label htmlFor="room" className="text-xs font-medium text-muted-foreground">
                Room
              </label>
              <select
                id="room"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a room…</option>
                {activeRooms.map((r) => (
                  <option key={r.roomId} value={r.roomNumber}>
                    Room {r.roomNumber} — {r.guestName}
                  </option>
                ))}
              </select>
              {activeRooms.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">No checked-in rooms available.</p>
              )}
            </div>

            {selectedRoomInfo && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{selectedRoomInfo.guestName}</div>
                <div className="text-xs text-muted-foreground">Room {selectedRoomInfo.roomNumber}</div>
              </div>
            )}

            <div>
              <label htmlFor="staffNote" className="text-xs font-medium text-muted-foreground">
                Staff note (optional)
              </label>
              <textarea
                id="staffNote"
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="e.g. Served poolside"
              />
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">Order total</div>
              <div className="mt-1 font-semibold">{formatCurrency(total, hotel.currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{cart.length} item(s)</div>
            </div>

            {chargeError && <p className="text-sm text-rose-600">{chargeError}</p>}

            <button
              type="submit"
              disabled={charging || cart.length === 0 || !selectedRoom}
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {charging ? "Charging…" : "Confirm Charge"}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
