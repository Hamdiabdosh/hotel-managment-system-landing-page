import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { FolioView } from "@/components/billing/FolioView";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  addFolioCharge,
  closeFolio,
  getFoliosForHotel,
  recordPayment,
  voidFolioItem,
} from "@/lib/api/billing.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_FOLIOS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import type { Folio, FolioItem, FolioItemCategory } from "@/lib/types";

const searchSchema = z.object({
  folioId: z.string().optional(),
});

type PaymentMethod = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER" | "ROOM_CHARGE" | "OTHER";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "ROOM_CHARGE", label: "Room Charge" },
  { value: "OTHER", label: "Other" },
];

const CHARGE_CATEGORIES: FolioItemCategory[] = [
  "FOOD", "BEVERAGE", "SPA", "LAUNDRY", "MINIBAR", "OTHER",
];

export const Route = createFileRoute("/dashboard/billing")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/billing")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      const folios = await getFoliosForHotel({ data: { hotelId: hotel.id, status: "ALL" } });
      return { folios };
    } catch {
      return { folios: MOCK_FOLIOS };
    }
  },
  component: BillingPage,
});

function BillingPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { folioId } = Route.useSearch();
  const { folios } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const router = useRouter();

  const openFolios = folios.filter((f) => f.status === "OPEN");

  const folioFromSearch = folioId
    ? folios.find((f) => f.id === folioId || f.reservationId === folioId)
    : undefined;

  const [selectedId, setSelectedId] = useState(
    folioFromSearch?.id ?? openFolios[0]?.id ?? folios[0]?.id,
  );

  useEffect(() => {
    if (folioFromSearch) setSelectedId(folioFromSearch.id);
  }, [folioId, folioFromSearch?.id]);

  const [extraItems, setExtraItems] = useState<FolioItem[]>([]);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    description: "",
    amount: "",
    category: "FOOD" as FolioItemCategory,
  });
  const [chargeError, setChargeError] = useState<string | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CREDIT_CARD" as PaymentMethod,
    reference: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const baseFolio = folios.find((f) => f.id === selectedId);
  const selected = useMemo((): (Folio & { extraItems?: FolioItem[] }) | undefined => {
    if (!baseFolio) return undefined;
    const addedTotal = extraItems.reduce((s, i) => s + i.amount, 0);
    return {
      ...baseFolio,
      extraItems,
      totalAmount: baseFolio.totalAmount + addedTotal,
    };
  }, [baseFolio, extraItems]);

  const balance = selected ? selected.totalAmount - selected.paidAmount : 0;

  useEffect(() => {
    if (paymentOpen && selected) {
      setPaymentForm((f) => ({
        ...f,
        amount: Math.max(0, balance).toFixed(2),
      }));
    }
  }, [paymentOpen, balance, selected?.id]);

  const handleAddCharge = async () => {
    const amount = parseFloat(chargeForm.amount);
    if (!chargeForm.description.trim()) {
      setChargeError("Description is required");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setChargeError("Amount must be greater than 0");
      return;
    }
    if (!selected) return;

    const localItem: FolioItem = {
      id: `local_${Date.now()}`,
      description: chargeForm.description.trim(),
      amount,
      category: chargeForm.category,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setExtraItems((prev) => [...prev, localItem]);
    setAddChargeOpen(false);
    setChargeForm({ description: "", amount: "", category: "FOOD" });
    setChargeError(null);

    try {
      await addFolioCharge({
        data: {
          folioId: selected.id,
          description: localItem.description,
          amount,
          category: chargeForm.category,
        },
      });
      setExtraItems((prev) => prev.filter((i) => i.id !== localItem.id));
      router.invalidate();
    } catch (err) {
      setExtraItems((prev) => prev.filter((i) => i.id !== localItem.id));
      console.warn("[billing] add charge failed:", err);
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Enter a valid amount");
      return;
    }
    if (!selected) return;

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      await recordPayment({
        data: {
          folioId: selected.id,
          amount,
          method: paymentForm.method,
          reference: paymentForm.reference || undefined,
        },
      });
      setPaymentOpen(false);
      setPaymentForm({ amount: "", method: "CREDIT_CARD", reference: "" });
      router.invalidate();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleVoidItem = async (itemId: string) => {
    const reason = window.prompt("Reason for voiding this charge:");
    if (!reason || !selected) return;

    try {
      await voidFolioItem({ data: { itemId, folioId: selected.id, reason } });
      router.invalidate();
    } catch (err) {
      console.warn("[billing] void item failed:", err);
    }
  };

  const handleCloseFolio = async () => {
    if (!selected) return;
    try {
      await closeFolio({ data: { folioId: selected.id } });
      router.invalidate();
    } catch (err) {
      console.warn("[billing] close folio failed:", err);
    }
  };

  return (
    <ModuleErrorBoundary module="Billing">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <h3 className="font-serif text-lg font-semibold">Open Folios</h3>
          {openFolios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open folios.</p>
          ) : (
            openFolios.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedId(f.id);
                  setExtraItems([]);
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedId === f.id ? "border-foreground bg-muted/50" : "bg-card hover:bg-muted/30"
                }`}
              >
                <div className="font-medium">{f.guestName}</div>
                <div className="text-xs text-muted-foreground">Room {f.roomNumber}</div>
                <div className="mt-2 text-sm font-semibold">
                  Due: {formatCurrency(f.totalAmount - f.paidAmount, hotel.currency)}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <FolioView
                folio={selected}
                currency={hotel.currency}
                onAddCharge={can("addFolioCharge") ? () => setAddChargeOpen(true) : undefined}
                onRecordPayment={can("recordPayment") ? () => setPaymentOpen(true) : undefined}
                onVoidItem={can("voidFolioItem") ? handleVoidItem : undefined}
                onClose={can("closeFolio") ? handleCloseFolio : undefined}
              />
            </div>
          ) : (
            <div className="rounded-2xl border bg-card px-8 py-16 text-center text-muted-foreground">
              Select a folio to view details.
            </div>
          )}
        </div>
      </div>

      <Sheet open={addChargeOpen} onOpenChange={setAddChargeOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Add Charge</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input
                value={chargeForm.description}
                onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={chargeForm.amount}
                onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={chargeForm.category}
                onChange={(e) =>
                  setChargeForm((f) => ({ ...f, category: e.target.value as FolioItemCategory }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {CHARGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {chargeError && <p className="text-sm text-rose-600">{chargeError}</p>}
            <button
              onClick={handleAddCharge}
              className="w-full rounded-md px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              Add to Folio
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Record Payment</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reference (optional)</label>
              <input
                type="text"
                placeholder="Transaction ref, cheque #, etc."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {paymentError && <p className="text-sm text-rose-600">{paymentError}</p>}
            <button
              onClick={handleRecordPayment}
              disabled={paymentLoading}
              className="w-full rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {paymentLoading ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
