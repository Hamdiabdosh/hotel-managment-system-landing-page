import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { FolioView } from "@/components/billing/FolioView";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { MOCK_FOLIOS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const hotel = HOTEL_LIST[0]!;
  const openFolios = MOCK_FOLIOS.filter((f) => f.status === "OPEN");
  const [selectedId, setSelectedId] = useState(openFolios[0]?.id ?? MOCK_FOLIOS[0]?.id);
  const selected = MOCK_FOLIOS.find((f) => f.id === selectedId);

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
                onClick={() => setSelectedId(f.id)}
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
                onAddCharge={() => alert("Add charge modal (shell)")}
                onRecordPayment={() => alert("Record payment modal (shell)")}
              />
            </div>
          ) : (
            <div className="rounded-2xl border bg-card px-8 py-16 text-center text-muted-foreground">
              Select a folio to view details.
            </div>
          )}
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
