import { createFileRoute, redirect } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { HousekeepingBoard } from "@/components/housekeeping/HousekeepingBoard";
import { getHousekeepingTasks } from "@/lib/api/rooms.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { MOCK_HOUSEKEEPING } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";

export const Route = createFileRoute("/dashboard/housekeeping")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/housekeeping")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      const tasks = await getHousekeepingTasks({ data: { hotelId: hotel.id } });
      return { tasks };
    } catch {
      return { tasks: MOCK_HOUSEKEEPING };
    }
  },
  component: HousekeepingPage,
});

function HousekeepingPage() {
  const { tasks } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);

  return (
    <ModuleErrorBoundary module="Housekeeping">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Click cards to advance tasks through the cleaning workflow. Use Assign to reassign rooms.
        </p>
        <HousekeepingBoard tasks={tasks} canAssign={can("assignHousekeepingTask")} />
      </div>
    </ModuleErrorBoundary>
  );
}
