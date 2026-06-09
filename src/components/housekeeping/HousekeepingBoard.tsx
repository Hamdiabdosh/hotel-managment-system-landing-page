import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { advanceHousekeepingTask } from "@/lib/api/rooms.functions";
import { assignHousekeepingTask } from "@/lib/api/front-desk.functions";
import { MOCK_STAFF } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";
import type { HousekeepingTask, HousekeepingTaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: { status: HousekeepingTaskStatus; label: string }[] = [
  { status: "TO_CLEAN", label: "To Clean" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "INSPECTING", label: "Inspecting" },
  { status: "DONE", label: "Done" },
];

const NEXT_STATUS: Record<HousekeepingTaskStatus, HousekeepingTaskStatus | null> = {
  TO_CLEAN: "IN_PROGRESS",
  IN_PROGRESS: "INSPECTING",
  INSPECTING: "DONE",
  DONE: null,
};

const PRIORITY_COLORS = {
  LOW: "text-zinc-500",
  NORMAL: "text-sky-600",
  HIGH: "text-orange-600",
  URGENT: "text-rose-600",
};

interface Props {
  tasks: HousekeepingTask[];
  canAssign?: boolean;
}

export function HousekeepingBoard({ tasks: initial, canAssign = true }: Props) {
  const [tasks, setTasks] = useState(initial);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const hotel = useHotelStore((s) => s.selectedHotel);
  const router = useRouter();

  useEffect(() => {
    setTasks(initial);
  }, [initial]);

  const handleAdvance = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = NEXT_STATUS[task.status];
    if (!next) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)));

    try {
      await advanceHousekeepingTask({ data: { id: taskId } });
      router.invalidate();
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)));
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedStaffId) return;
    const taskId = assignModal;
    const task = tasks.find((t) => t.id === taskId);
    const staff = MOCK_STAFF.find((s) => s.id === selectedStaffId);

    if (staff) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, assignedTo: staff.name, assignedInitials: staff.initials }
            : t,
        ),
      );
    }

    try {
      await assignHousekeepingTask({
        data: { taskId, assignedToId: selectedStaffId, hotelId: hotel.id },
      });
    } catch (err) {
      if (task) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, assignedTo: task.assignedTo, assignedInitials: task.assignedInitials }
              : t,
          ),
        );
      }
      console.warn("[housekeeping] assign failed:", err);
    }

    setAssignModal(null);
    setSelectedStaffId("");
    router.invalidate();
  };

  const housekeepingStaff = MOCK_STAFF.filter((s) => s.role === "HOUSEKEEPING" && s.active);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className="rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground">
                {tasks.filter((t) => t.status === col.status).length}
              </span>
            </div>
            <div className="space-y-2 p-3">
              {tasks
                .filter((t) => t.status === col.status)
                .map((t) => (
                  <div key={t.id} className="rounded-xl border bg-background p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif text-lg font-bold">Room {t.roomNumber}</div>
                        <div className="text-xs text-muted-foreground">{t.roomType}</div>
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase", PRIORITY_COLORS[t.priority])}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {t.assignedInitials}
                      </div>
                      <span className="text-xs text-muted-foreground">{t.assignedTo}</span>
                    </div>
                    {t.notes && <p className="mt-2 text-xs text-amber-700">{t.notes}</p>}
                    <div className="mt-3 flex gap-1">
                      {NEXT_STATUS[t.status] && (
                        <button
                          onClick={() => handleAdvance(t.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                        >
                          Advance <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                      {canAssign && (
                        <button
                          onClick={() => {
                            setAssignModal(t.id);
                            setSelectedStaffId(housekeepingStaff[0]?.id ?? "");
                          }}
                          className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {tasks.filter((t) => t.status === col.status).length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="font-serif text-lg font-semibold">Assign Task</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select a housekeeper for this room.</p>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {housekeepingStaff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setAssignModal(null);
                  setSelectedStaffId("");
                }}
                className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 rounded-md px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
