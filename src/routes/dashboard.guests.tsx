import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { GuestTable } from "@/components/guests/GuestTable";
import { MOCK_GUESTS } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/guests")({
  component: GuestsPage,
});

function GuestsPage() {
  const [q, setQ] = useState("");
  const guests = useMemo(() => {
    if (!q) return MOCK_GUESTS;
    const lower = q.toLowerCase();
    return MOCK_GUESTS.filter(
      (g) =>
        g.firstName.toLowerCase().includes(lower) ||
        g.lastName.toLowerCase().includes(lower) ||
        g.email.toLowerCase().includes(lower),
    );
  }, [q]);

  return (
    <ModuleErrorBoundary module="Guests">
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guests by name or email"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {guests.length === 0 ? (
          <div className="rounded-2xl border bg-card px-8 py-16 text-center">
            <p className="text-muted-foreground">No guests match your search.</p>
          </div>
        ) : (
          <GuestTable guests={guests} />
        )}
      </div>
    </ModuleErrorBoundary>
  );
}
