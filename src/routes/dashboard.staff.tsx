import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { MOCK_STAFF } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/staff")({
  component: StaffPage,
});

const ROLE_COLORS: Record<string, string> = {
  HOTEL_ADMIN: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  FRONT_DESK: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  HOUSEKEEPING: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  MAINTENANCE: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  ACCOUNTANT: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  POS_STAFF: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  SUPER_ADMIN: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
};

function StaffPage() {
  return (
    <ModuleErrorBoundary module="Staff">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            <UserPlus className="h-4 w-4" /> Add Staff Member
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MOCK_STAFF.map((s) => (
            <div key={s.id} className={`rounded-2xl border bg-card p-5 shadow-sm ${!s.active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {s.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.email}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_COLORS[s.role] ?? ""}`}>
                      {s.role.replace("_", " ")}
                    </span>
                    <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">{s.department}</span>
                    {!s.active && <span className="text-[11px] text-rose-600">Inactive</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
