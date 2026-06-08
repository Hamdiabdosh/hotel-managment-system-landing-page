import { Link } from "@tanstack/react-router";
import type { Guest } from "@/lib/types";
import { useSortableTable } from "@/hooks/useSortableTable";

interface Props {
  guests: Guest[];
}

export function GuestTable({ guests }: Props) {
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(
    guests,
    {
      name: (g) => `${g.lastName} ${g.firstName}`,
      email: (g) => g.email,
      stays: (g) => g.totalStays,
      lastStay: (g) => g.lastStay ?? "",
      loyalty: (g) => g.loyaltyPoints,
    },
    "name",
  );

  const SortTh = ({ k, label }: { k: string; label: string }) => (
    <th
      className="cursor-pointer px-4 py-3 hover:text-foreground"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <SortTh k="name" label="Guest" />
              <SortTh k="email" label="Email" />
              <th className="px-4 py-3">Phone</th>
              <SortTh k="stays" label="Stays" />
              <SortTh k="lastStay" label="Last Stay" />
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((g) => (
              <tr key={g.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {g.firstName[0]}{g.lastName[0]}
                    </div>
                    <span className="font-medium">{g.firstName} {g.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{g.email}</td>
                <td className="px-4 py-3">{g.phone}</td>
                <td className="px-4 py-3">{g.totalStays}</td>
                <td className="px-4 py-3 text-muted-foreground">{g.lastStay ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px] font-medium">
                    {g.loyaltyTier ?? "Bronze"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/dashboard/guests/$id"
                    params={{ id: g.id }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--hotel-primary)" }}
                  >
                    View profile
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
