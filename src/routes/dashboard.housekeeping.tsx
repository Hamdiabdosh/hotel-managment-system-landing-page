import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { HousekeepingBoard } from "@/components/housekeeping/HousekeepingBoard";
import { MOCK_HOUSEKEEPING } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/housekeeping")({
  component: HousekeepingPage,
});

function HousekeepingPage() {
  return (
    <ModuleErrorBoundary module="Housekeeping">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Click cards to advance tasks through the cleaning workflow. Use Assign to reassign rooms.
        </p>
        <HousekeepingBoard tasks={MOCK_HOUSEKEEPING} />
      </div>
    </ModuleErrorBoundary>
  );
}
