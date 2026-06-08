import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { HOTEL_LIST } from "@/lib/config/hotels";
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
  component: PosPage,
});

function PosPage() {
  const hotel = HOTEL_LIST[0]!;
  const [cart, setCart] = useState<PosOrderItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const categories = ["ALL", ...new Set(MOCK_POS_ITEMS.map((i) => i.category))];

  const items = category === "ALL" ? MOCK_POS_ITEMS : MOCK_POS_ITEMS.filter((i) => i.category === category);

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

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

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
              onClick={() => { alert("Charge to room modal (shell)"); setCart([]); }}
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
    </ModuleErrorBoundary>
  );
}
