import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { MOCK_HOUSEKEEPING, MOCK_ROOMS } from "@/lib/mock-data";
import type { HousekeepingTask, HousekeepingTaskStatus, Room, RoomStatus } from "@/lib/types";

export { updateRoomStatus } from "@/lib/api/front-desk.functions";

const hotelIdSchema = z.object({ hotelId: z.string() });

const advanceHousekeepingTaskSchema = z.object({ id: z.string() });

const createHousekeepingTaskSchema = z.object({
  hotelId: z.string(),
  roomId: z.string(),
  type: z.enum(["STANDARD", "DEEP_CLEAN", "TURNDOWN", "INSPECTION"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});

export interface ActiveStay {
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
}

const HK_NEXT: Record<HousekeepingTaskStatus, HousekeepingTaskStatus | null> = {
  TO_CLEAN: "IN_PROGRESS",
  IN_PROGRESS: "INSPECTING",
  INSPECTING: "DONE",
  DONE: null,
};

function staffInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapPrismaRoom(r: {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: RoomStatus;
  pricePerNight: number;
  maxOccupancy: number;
  roomTypeId: string | null;
  roomType?: { id: string; name: string } | null;
}): Room {
  return {
    id: r.id,
    number: r.number,
    typeId: r.roomTypeId ?? r.roomType?.id ?? r.type.toLowerCase().replace(/\s+/g, "_"),
    typeName: r.roomType?.name ?? r.type,
    floor: r.floor,
    status: r.status,
    pricePerNight: r.pricePerNight,
    maxOccupancy: r.maxOccupancy,
  };
}

function mapPrismaHousekeepingTask(t: {
  id: string;
  roomId: string;
  type: HousekeepingTask["type"];
  status: HousekeepingTask["status"];
  priority: HousekeepingTask["priority"];
  notes: string | null;
  room: { number: string; type: string };
  assignedTo: { name: string } | null;
}): HousekeepingTask {
  const assignedTo = t.assignedTo?.name ?? "Unassigned";
  return {
    id: t.id,
    roomId: t.roomId,
    roomNumber: t.room.number,
    roomType: t.room.type,
    assignedTo,
    assignedInitials: staffInitials(assignedTo),
    type: t.type,
    status: t.status,
    priority: t.priority,
    notes: t.notes ?? undefined,
  };
}

function mockAdvanceTask(id: string): HousekeepingTask {
  const task = MOCK_HOUSEKEEPING.find((t) => t.id === id) ?? MOCK_HOUSEKEEPING[0]!;
  const next = HK_NEXT[task.status];
  if (!next) throw new Error("Task cannot be advanced");
  return { ...task, status: next };
}

export const listRoomsForHotel = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    try {
      const rooms = await prisma.room.findMany({
        where: { hotelId: data.hotelId },
        include: {
          roomType: true,
          reservations: {
            where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
            include: { guest: true },
            orderBy: { checkIn: "asc" },
            take: 1,
          },
          housekeepingTasks: {
            where: { status: { not: "DONE" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { room: true, assignedTo: true },
          },
        },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      });

      const activeStays: ActiveStay[] = [];
      const housekeepingTasks: HousekeepingTask[] = [];

      for (const room of rooms) {
        const reservation = room.reservations[0];
        if (reservation) {
          activeStays.push({
            roomId: room.id,
            guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
            checkIn: reservation.checkIn.toISOString().slice(0, 10),
            checkOut: reservation.checkOut.toISOString().slice(0, 10),
          });
        }
        for (const task of room.housekeepingTasks) {
          housekeepingTasks.push(mapPrismaHousekeepingTask(task));
        }
      }

      return {
        rooms: rooms.map(mapPrismaRoom),
        activeStays,
        housekeepingTasks,
      };
    } catch (err) {
      console.warn("[rooms] listRoomsForHotel fallback to mock:", err);
      return { rooms: MOCK_ROOMS, activeStays: [], housekeepingTasks: MOCK_HOUSEKEEPING };
    }
  });

export const getHousekeepingTasks = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    try {
      const tasks = await prisma.housekeepingTask.findMany({
        where: { hotelId: data.hotelId, status: { not: "DONE" } },
        include: { room: true, assignedTo: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      return tasks.map(mapPrismaHousekeepingTask);
    } catch (err) {
      console.warn("[rooms] getHousekeepingTasks fallback to mock:", err);
      return MOCK_HOUSEKEEPING;
    }
  });

export const createHousekeepingTask = createServerFn({ method: "POST" })
  .inputValidator(createHousekeepingTaskSchema)
  .handler(async ({ data }) => {
    await requireAction("assignHousekeepingTask");

    try {
      const task = await prisma.housekeepingTask.create({
        data: {
          hotelId: data.hotelId,
          roomId: data.roomId,
          type: data.type,
          priority: data.priority,
          assignedToId: data.assignedToId,
          notes: data.notes,
          status: "TO_CLEAN",
        },
        include: { room: true, assignedTo: true },
      });

      return mapPrismaHousekeepingTask(task);
    } catch (err) {
      console.warn("[rooms] createHousekeepingTask fallback to mock:", err);
      const room = MOCK_ROOMS.find((r) => r.id === data.roomId) ?? MOCK_ROOMS[0]!;
      return {
        id: `hk_mock_${Date.now()}`,
        roomId: data.roomId,
        roomNumber: room.number,
        roomType: room.typeName,
        assignedTo: "Unassigned",
        assignedInitials: "UN",
        type: data.type,
        status: "TO_CLEAN" as const,
        priority: data.priority,
        notes: data.notes,
      };
    }
  });

export const advanceHousekeepingTask = createServerFn({ method: "POST" })
  .inputValidator(advanceHousekeepingTaskSchema)
  .handler(async ({ data }) => {
    await requireAction("advanceHousekeepingTask");

    try {
      const dbTask = await prisma.housekeepingTask.findUniqueOrThrow({
        where: { id: data.id },
        include: { room: true, assignedTo: true },
      });
      const next = HK_NEXT[dbTask.status as HousekeepingTaskStatus];
      if (!next) throw new Error("Task cannot be advanced");

      const updated = await prisma.$transaction(async (tx) => {
        const task = await tx.housekeepingTask.update({
          where: { id: data.id },
          data: {
            status: next,
            completedAt: next === "DONE" ? new Date() : null,
          },
          include: { room: true, assignedTo: true },
        });

        if (next === "DONE") {
          await tx.room.update({
            where: { id: dbTask.roomId },
            data: { status: "AVAILABLE" },
          });
        }

        return task;
      });

      return mapPrismaHousekeepingTask(updated);
    } catch (err) {
      console.warn("[rooms] advanceHousekeepingTask fallback to mock:", err);
      return mockAdvanceTask(data.id);
    }
  });
