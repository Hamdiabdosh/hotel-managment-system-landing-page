import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createMaintenanceOrder,
  listMaintenanceOrders,
  updateMaintenanceStatus,
} from "@/lib/api/maintenance.functions";
import { listRoomsForHotel } from "@/lib/api/rooms.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import {
  MOCK_MAINTENANCE,
  MOCK_ROOMS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_STATUS_COLORS,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { useHotelStore } from "@/store/hotelStore";
import type { MaintenanceOrder, MaintenancePriority, MaintenanceStatus } from "@/lib/types";

const STATUS_FILTERS: (MaintenanceStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_FILTERS: (MaintenancePriority | "ALL")[] = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

export const Route = createFileRoute("/dashboard/maintenance")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/maintenance")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotelId = useHotelStore.getState().selectedHotel.id;
    try {
      const [orders, roomsResult] = await Promise.all([
        listMaintenanceOrders({ data: { hotelId } }),
        listRoomsForHotel({ data: { hotelId } }),
      ]);
      return { orders, rooms: roomsResult.rooms };
    } catch (err) {
      console.warn("[maintenance] DB unavailable, using mock data:", err);
      return { orders: MOCK_MAINTENANCE, rooms: MOCK_ROOMS };
    }
  },
  component: MaintenancePage,
});

interface CreateFormState {
  title: string;
  description: string;
  priority: MaintenancePriority;
  roomNumber: string;
  estimatedCost: string;
}

const EMPTY_FORM: CreateFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  roomNumber: "",
  estimatedCost: "",
};

function MaintenancePage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { orders: initialOrders, rooms } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const router = useRouter();

  const [orders, setOrders] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<(typeof PRIORITY_FILTERS)[number]>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && o.priority !== priorityFilter) return false;
      return true;
    });
  }, [orders, statusFilter, priorityFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Title and description are required");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const roomId = form.roomNumber.trim()
      ? rooms.find((r) => r.number === form.roomNumber.trim())?.id
      : undefined;
    const estimatedCost = form.estimatedCost ? Number(form.estimatedCost) : undefined;

    try {
      const created = await createMaintenanceOrder({
        data: {
          hotelId: hotel.id,
          roomId,
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          estimatedCost: estimatedCost && !Number.isNaN(estimatedCost) ? estimatedCost : undefined,
          reportedById: session.user.id,
        },
      });

      const withRoomNumber =
        roomId && !created.roomNumber
          ? { ...created, roomNumber: form.roomNumber.trim() }
          : created;

      setOrders((prev) => [withRoomNumber, ...prev]);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      toast.success("Maintenance order created");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (order: MaintenanceOrder, newStatus: MaintenanceStatus) => {
    const previous = order.status;
    setUpdatingId(order.id);
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)),
    );

    try {
      const updated = await updateMaintenanceStatus({
        data: { id: order.id, hotelId: hotel.id, status: newStatus },
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      router.invalidate();
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: previous } : o)),
      );
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderActions = (order: MaintenanceOrder) => {
    if (order.status === "OPEN") {
      return (
        <div className="flex gap-1">
          <button
            type="button"
            disabled={updatingId === order.id}
            onClick={() => handleStatusUpdate(order, "IN_PROGRESS")}
            className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            disabled={updatingId === order.id}
            onClick={() => handleStatusUpdate(order, "CANCELLED")}
            className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }
    if (order.status === "IN_PROGRESS") {
      return (
        <div className="flex gap-1">
          <button
            type="button"
            disabled={updatingId === order.id}
            onClick={() => handleStatusUpdate(order, "COMPLETED")}
            className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            Complete
          </button>
          <button
            type="button"
            disabled={updatingId === order.id}
            onClick={() => handleStatusUpdate(order, "CANCELLED")}
            className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <ModuleErrorBoundary module="Maintenance">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                }`}
              >
                {s === "ALL" ? "All statuses" : s.replace("_", " ")}
              </button>
            ))}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as (typeof PRIORITY_FILTERS)[number])}
              className="rounded-md border bg-card px-3 py-1.5 text-xs"
            >
              {PRIORITY_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All priorities" : p}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
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
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No maintenance orders match your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      {o.roomNumber ? `Room ${o.roomNumber}` : "Common area"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${MAINTENANCE_PRIORITY_COLORS[o.priority]}`}
                      >
                        {o.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${MAINTENANCE_STATUS_COLORS[o.status]}`}
                      >
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{o.assignedTo ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      {o.estimatedCost ? formatCurrency(o.estimatedCost, hotel.currency) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">{renderActions(o)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">New Work Order</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div>
              <label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="priority" className="text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as MaintenancePriority }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label htmlFor="roomNumber" className="text-xs font-medium text-muted-foreground">
                Room # (optional)
              </label>
              <input
                id="roomNumber"
                value={form.roomNumber}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="e.g. 201"
              />
            </div>
            <div>
              <label htmlFor="estimatedCost" className="text-xs font-medium text-muted-foreground">
                Estimated cost (optional)
              </label>
              <input
                id="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCost}
                onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {formError && <p className="text-sm text-rose-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {submitting ? "Creating…" : "Create Order"}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
