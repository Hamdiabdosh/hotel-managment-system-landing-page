import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { HousekeepingBoard } from "@/components/housekeeping/HousekeepingBoard";
import { getHousekeepingTasks } from "@/lib/api/rooms.functions";
import { useHotelStore } from "@/store/hotelStore";

export const Route = createFileRoute("/dashboard/housekeeping")({
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    const tasks = await getHousekeepingTasks({ data: { hotelId: hotel.id } });
    return { tasks };
  },
  component: HousekeepingPage,
});

function HousekeepingPage() {
  const { tasks } = Route.useLoaderData();

  return (
    <ModuleErrorBoundary module="Housekeeping">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Click cards to advance tasks through the cleaning workflow. Use Assign to reassign rooms.
        </p>
        <HousekeepingBoard tasks={tasks} />
      </div>
    </ModuleErrorBoundary>
  );
}
