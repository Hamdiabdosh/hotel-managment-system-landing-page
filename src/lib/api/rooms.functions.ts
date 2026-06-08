import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { HousekeepingTask, Room, RoomStatus } from "@/lib/types";

const hotelIdSchema = z.object({ hotelId: z.string() });

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
}): Room {
  return {
    id: r.id,
    number: r.number,
    typeId: r.roomTypeId ?? r.type.toLowerCase().replace(/\s+/g, "_"),
    typeName: r.type,
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

export const listRoomsForHotel = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    const [rooms, activeReservations, housekeepingTasks] = await Promise.all([
      prisma.room.findMany({
        where: { hotelId: data.hotelId },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      }),
      prisma.reservation.findMany({
        where: { hotelId: data.hotelId, status: "CHECKED_IN" },
        include: { guest: true },
      }),
      prisma.housekeepingTask.findMany({
        where: { hotelId: data.hotelId },
        include: { room: true, assignedTo: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const activeStays = activeReservations.map((r) => ({
      roomId: r.roomId,
      guestId: r.guestId,
      guestName: `${r.guest.firstName} ${r.guest.lastName}`,
      firstName: r.guest.firstName,
      lastName: r.guest.lastName,
      checkOut: r.checkOut.toISOString().slice(0, 10),
    }));

    return {
      rooms: rooms.map(mapPrismaRoom),
      activeStays,
      housekeepingTasks: housekeepingTasks.map(mapPrismaHousekeepingTask),
    };
  });

export const getHousekeepingTasks = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    const tasks = await prisma.housekeepingTask.findMany({
      where: { hotelId: data.hotelId },
      include: { room: true, assignedTo: true },
      orderBy: [{ status: "asc" }, { priority: "desc" }],
    });

    return tasks.map(mapPrismaHousekeepingTask);
  });
