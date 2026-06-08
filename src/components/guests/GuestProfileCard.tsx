import type { Guest, Reservation } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { RES_STATUS_COLORS } from "@/lib/mock-data";

interface Props {
  guest: Guest;
  stayHistory: Reservation[];
  currency: string;
}

export function GuestProfileCard({ guest, stayHistory, currency }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            {guest.firstName[0]}{guest.lastName[0]}
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold">{guest.firstName} {guest.lastName}</h2>
            <p className="text-sm text-muted-foreground">{guest.email} · {guest.phone}</p>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">{guest.loyaltyTier}</span>
              <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">{guest.loyaltyPoints} pts</span>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Nationality</dt><dd className="font-medium">{guest.nationality}</dd></div>
          <div><dt className="text-xs text-muted-foreground">ID</dt><dd className="font-medium">{guest.idType}: {guest.idNumber}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Date of Birth</dt><dd className="font-medium">{guest.dateOfBirth ? formatDate(guest.dateOfBirth) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Total Stays</dt><dd className="font-medium">{guest.totalStays}</dd></div>
        </dl>
      </div>

      {guest.preferences && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-lg font-semibold">Preferences</h3>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {Object.entries(guest.preferences).map(([k, v]) => (
              <div key={k}><dt className="text-xs capitalize text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="font-serif text-lg font-semibold">Stay History</h3>
        </div>
        <ul className="divide-y">
          {stayHistory.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm font-medium">Room {r.roomNumber} · {r.roomType}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {r.nights}n
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatCurrency(r.totalAmount, currency)}</div>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RES_STATUS_COLORS[r.status]}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
            </li>
          ))}
          {stayHistory.length === 0 && (
            <li className="px-6 py-12 text-center text-sm text-muted-foreground">No stay history yet.</li>
          )}
        </ul>
      </div>

      {guest.notes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Notes:</strong> {guest.notes}
        </div>
      )}
    </div>
  );
}
