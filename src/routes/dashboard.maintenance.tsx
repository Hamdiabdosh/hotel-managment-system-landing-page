import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { MOCK_MAINTENANCE, MAINTENANCE_PRIORITY_COLORS, MAINTENANCE_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { HOTEL_LIST } from "@/lib/config/hotels";

export const Route = createFileRoute("/dashboard/maintenance")({
  component: MaintenancePage,
});

function MaintenancePage() {
  const hotel = HOTEL_LIST[0]!;

  return (
    <ModuleErrorBoundary module="Maintenance">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            <Plus className="h-4 w-4" /> New Work Order
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Est. Cost</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {MOCK_MAINTENANCE.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.description}</div>
                  </td>
                  <td className="px-4 py-3">{o.roomNumber ? `Room ${o.roomNumber}` : "Common area"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${MAINTENANCE_PRIORITY_COLORS[o.priority]}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${MAINTENANCE_STATUS_COLORS[o.status]}`}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.assignedTo ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{o.estimatedCost ? formatCurrency(o.estimatedCost, hotel.currency) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
