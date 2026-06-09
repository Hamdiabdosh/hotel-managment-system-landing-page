import { Plus, CreditCard, X, CheckCircle, Printer } from "lucide-react";
import type { Folio, FolioItem } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  folio: Folio & { extraItems?: FolioItem[] };
  currency: string;
  onAddCharge?: () => void;
  onRecordPayment?: () => void;
  onVoidItem?: (itemId: string) => void;
  onClose?: () => void;
}

export function FolioView({
  folio,
  currency,
  onAddCharge,
  onRecordPayment,
  onVoidItem,
  onClose,
}: Props) {
  const balance = folio.totalAmount - folio.paidAmount;
  const allItems = [...folio.items, ...(folio.extraItems ?? [])];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold">{folio.guestName}</h3>
          <p className="text-sm text-muted-foreground">
            Room {folio.roomNumber} · Folio {folio.id}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            folio.status === "OPEN"
              ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
          }`}
        >
          {folio.status}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              {folio.status === "OPEN" && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {allItems.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.description}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(item.amount, currency)}
                </td>
                {folio.status === "OPEN" && (
                  <td className="px-4 py-3 text-right">
                    {item.category !== "ROOM" && (
                      <button
                        onClick={() => onVoidItem?.(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                        title="Void this charge"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {folio.payments.length > 0 && (
        <div className="rounded-xl border p-4">
          <h4 className="text-sm font-semibold">Payment History</h4>
          <ul className="mt-2 space-y-2">
            {folio.payments.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span>
                  {p.method} · {p.reference} · {formatDate(p.createdAt)}
                </span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(p.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
        <div className="space-y-1 text-sm">
          <div>
            Total: <strong>{formatCurrency(folio.totalAmount, currency)}</strong>
          </div>
          <div>
            Paid: <strong>{formatCurrency(folio.paidAmount, currency)}</strong>
          </div>
          <div className="text-base font-bold">
            Balance due: {formatCurrency(balance, currency)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {folio.status === "OPEN" && (
            <button
              onClick={onAddCharge}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> Add Charge
            </button>
          )}
          {folio.status === "OPEN" && (
            <button
              onClick={onRecordPayment}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </button>
          )}
          {Math.abs(balance) < 0.01 && folio.status === "OPEN" && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md border bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Close Folio
            </button>
          )}
          <button
            type="button"
            onClick={() => window.open(`/dashboard/billing/invoice/${folio.id}`, "_blank")}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Printer className="h-3.5 w-3.5" /> Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
