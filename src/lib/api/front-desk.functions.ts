import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { getTodayArrivals } from "@/lib/api/reservations.queries";
import { MOCK_RESERVATIONS, MOCK_ROOMS } from "@/lib/mock-data";
import { nightsBetween } from "@/lib/format";
import { earnPointsForStay } from "@/lib/loyalty";
import type {
  FolioStatus,
  HousekeepingTaskStatus,
  Reservation,
  ReservationSource,
  ReservationStatus,
  RoomStatus,
} from "@/lib/types";

const hotelIdSchema = z.object({ hotelId: z.string() });

const checkInOutSchema = z.object({
  reservationId: z.string(),
  hotelId: z.string(),
});

const updateRoomStatusSchema = z.object({
  roomId: z.string(),
  hotelId: z.string(),
  status: z.enum([
    "AVAILABLE",
    "OCCUPIED",
    "CLEANING",
    "INSPECTING",
    "MAINTENANCE",
    "OUT_OF_ORDER",
  ]),
});

const advanceTaskSchema = z.object({
  taskId: z.string(),
  hotelId: z.string(),
});

const assignTaskSchema = z.object({
  taskId: z.string(),
  assignedToId: z.string(),
  hotelId: z.string(),
});

const HK_NEXT: Record<HousekeepingTaskStatus, HousekeepingTaskStatus | null> = {
  TO_CLEAN: "IN_PROGRESS",
  IN_PROGRESS: "INSPECTING",
  INSPECTING: "DONE",
  DONE: null,
};

function mapPrismaReservation(r: {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  status: ReservationStatus;
  source: ReservationSource;
  totalAmount: number;
  specialRequests: string | null;
  guest: { firstName: string; lastName: string };
  room: { number: string; type: string };
  folios?: { totalAmount: number; paidAmount: number; status: FolioStatus }[];
}): Reservation {
  const checkIn = r.checkIn.toISOString().slice(0, 10);
  const checkOut = r.checkOut.toISOString().slice(0, 10);
  const folio = r.folios?.[0];
  return {
    id: r.id,
    code: `BK-${r.id.slice(-5).toUpperCase()}`,
    guestId: r.guestId,
    guestName: `${r.guest.firstName} ${r.guest.lastName}`,
    roomId: r.roomId,
    roomNumber: r.room.number,
    roomType: r.room.type,
    checkIn,
    checkOut,
    nights: nightsBetween(checkIn, checkOut),
    adults: r.adults,
    children: r.children,
    status: r.status,
    source: r.source,
    totalAmount: r.totalAmount,
    specialRequests: r.specialRequests ?? undefined,
    folioBalance: folio ? folio.totalAmount - folio.paidAmount : 0,
    folioStatus: folio?.status ?? null,
  };
}

async function getTodayDeparturesWithFolios(hotelId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.reservation.findMany({
    where: {
      hotelId,
      checkOut: { gte: today, lt: tomorrow },
      status: "CHECKED_IN",
    },
    include: {
      guest: true,
      room: true,
      folios: {
        select: { totalAmount: true, paidAmount: true, status: true },
        take: 1,
      },
    },
    orderBy: { checkOut: "asc" },
  });
}

export const getFrontDeskData = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [arrivals, departures, rooms] = await Promise.all([
        getTodayArrivals(data.hotelId),
        getTodayDeparturesWithFolios(data.hotelId),
        prisma.room.findMany({
          where: { hotelId: data.hotelId },
          select: { id: true, number: true, status: true, floor: true },
          orderBy: { number: "asc" },
        }),
      ]);
      return {
        arrivals: arrivals.map(mapPrismaReservation),
        departures: departures.map(mapPrismaReservation),
        rooms,
      };
    } catch (err) {
      console.warn("[front-desk] DB unavailable, using mock data:", err);
      const todayStr = new Date().toISOString().slice(0, 10);
      return {
        arrivals: MOCK_RESERVATIONS.filter(
          (r) => (r.status === "CONFIRMED" || r.status === "PENDING") && r.checkIn === todayStr,
        ),
        departures: MOCK_RESERVATIONS.filter(
          (r) => r.status === "CHECKED_IN" && r.checkOut === todayStr,
        ).map((r) => ({ ...r, folioBalance: 0, folioStatus: null as FolioStatus | null })),
        rooms: MOCK_ROOMS.map((r) => ({
          id: r.id,
          number: r.number,
          status: r.status as RoomStatus,
          floor: r.floor,
        })),
      };
    }
  });

export const checkIn = createServerFn({ method: "POST" })
  .inputValidator(checkInOutSchema)
  .handler(async ({ data }) => {
    let reservation;
    try {
      reservation = await prisma.reservation.findUniqueOrThrow({
        where: { id: data.reservationId },
      });
    } catch (err) {
      console.warn("[front-desk] DB unavailable on checkIn lookup:", err);
      return { success: true as const };
    }

    if (reservation.status !== "CONFIRMED" && reservation.status !== "PENDING") {
      throw new Error("Cannot check in: reservation is not confirmed");
    }

    const actor = await requireAction("updateReservationStatus");

    try {
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: data.reservationId },
          data: { status: "CHECKED_IN" },
        }),
        prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: "OCCUPIED" },
        }),
        prisma.auditLog.create({
          data: {
            hotelId: data.hotelId,
            userId: actor.userId,
            action: "CHECK_IN",
            entity: "Reservation",
            entityId: data.reservationId,
          },
        }),
      ]);
    } catch (err) {
      console.warn("[front-desk] DB unavailable on checkIn write:", err);
    }

    return { success: true as const };
  });

export const checkOut = createServerFn({ method: "POST" })
  .inputValidator(checkInOutSchema)
  .handler(async ({ data }) => {
    let reservation;
    try {
      reservation = await prisma.reservation.findUniqueOrThrow({
        where: { id: data.reservationId },
        include: { folios: true, guest: true },
      });
    } catch (err) {
      console.warn("[front-desk] DB unavailable on checkOut lookup:", err);
      return { success: true as const };
    }

    if (reservation.status !== "CHECKED_IN") {
      throw new Error("Cannot check out: guest is not checked in");
    }

    const folio = reservation.folios[0];
    if (folio && folio.status === "OPEN" && folio.paidAmount < folio.totalAmount) {
      const balance = folio.totalAmount - folio.paidAmount;
      throw new Error(
        `Cannot check out: folio has an outstanding balance of $${balance.toFixed(0)}`,
      );
    }

    const actor = await requireAction("updateReservationStatus");

    try {
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: data.reservationId },
          data: { status: "CHECKED_OUT" },
        }),
        prisma.room.update({
          where: { id: reservation.roomId },
          data: { status: "CLEANING" },
        }),
        ...(folio && folio.paidAmount >= folio.totalAmount
          ? [
              prisma.folio.update({
                where: { id: folio.id },
                data: { status: "CLOSED" },
              }),
            ]
          : []),
        prisma.guest.update({
          where: { id: reservation.guestId },
          data: { totalStays: { increment: 1 } },
        }),
        prisma.auditLog.create({
          data: {
            hotelId: data.hotelId,
            userId: actor.userId,
            action: "CHECK_OUT",
            entity: "Reservation",
            entityId: data.reservationId,
          },
        }),
      ]);
    } catch (err) {
      console.warn("[front-desk] DB unavailable on checkOut write:", err);
    }

    try {
      const nights = nightsBetween(
        reservation.checkIn.toISOString().slice(0, 10),
        reservation.checkOut.toISOString().slice(0, 10),
      );
      const earned = earnPointsForStay(nights, reservation.totalAmount);
      await prisma.$transaction([
        prisma.guest.update({
          where: { id: reservation.guestId },
          data: { loyaltyPoints: { increment: earned } },
        }),
        prisma.auditLog.create({
          data: {
            hotelId: data.hotelId,
            userId: actor.userId,
            action: "LOYALTY_ADJUST",
            entity: "LoyaltyPoints",
            entityId: reservation.guestId,
            after: { earned, reason: `Stay reward — reservation ${data.reservationId}` },
          },
        }),
      ]);
    } catch (err) {
      console.warn("[front-desk] Failed to award loyalty points:", err);
    }

    return { success: true as const };
  });

export const getAvailableRoomsForDate = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      hotelId: z.string(),
      checkIn: z.string(),
      checkOut: z.string(),
      roomType: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAction("updateReservationStatus");
    const occupied = await prisma.reservation.findMany({
      where: {
        hotelId: data.hotelId,
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        checkIn: { lt: new Date(data.checkOut) },
        checkOut: { gt: new Date(data.checkIn) },
      },
      select: { roomId: true },
    });
    const occupiedIds = occupied.map((r) => r.roomId);
    return prisma.room.findMany({
      where: {
        hotelId: data.hotelId,
        status: "AVAILABLE",
        id: { notIn: occupiedIds },
        ...(data.roomType ? { type: data.roomType } : {}),
      },
      select: { id: true, number: true, type: true, floor: true, pricePerNight: true },
      orderBy: { number: "asc" },
    });
  });

export const reassignRoom = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ reservationId: z.string(), newRoomId: z.string(), hotelId: z.string() }),
  )
  .handler(async ({ data }) => {
    const actor = await requireAction("updateReservationStatus");
    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: data.reservationId },
      select: {
        roomId: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
        room: { select: { pricePerNight: true } },
      },
    });
    const newRoom = await prisma.room.findUniqueOrThrow({
      where: { id: data.newRoomId },
      select: { pricePerNight: true, number: true, type: true },
    });
    const nights = Math.round(
      (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const newTotal = newRoom.pricePerNight * nights;
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: data.reservationId },
        data: { roomId: data.newRoomId, totalAmount: newTotal },
      }),
      prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "ROOM_REASSIGN",
          entity: "Reservation",
          entityId: data.reservationId,
          before: { roomId: reservation.roomId },
          after: { roomId: data.newRoomId, newTotal },
        },
      }),
    ]);
    return { success: true as const, newRoom };
  });

export const updateRoomStatus = createServerFn({ method: "POST" })
  .inputValidator(updateRoomStatusSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("updateRoomStatus");

    await prisma.$transaction([
      prisma.room.update({
        where: { id: data.roomId },
        data: { status: data.status },
      }),
      prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "ROOM_STATUS_CHANGE",
          entity: "Room",
          entityId: data.roomId,
          after: { status: data.status },
        },
      }),
    ]);
    return { success: true as const };
  });

export const advanceHousekeepingTask = createServerFn({ method: "POST" })
  .inputValidator(advanceTaskSchema)
  .handler(async ({ data }) => {
    await requireAction("advanceHousekeepingTask");

    const dbTask = await prisma.housekeepingTask.findUniqueOrThrow({
      where: { id: data.taskId },
      include: { room: true },
    });
    const dbNext = HK_NEXT[dbTask.status as HousekeepingTaskStatus];
    if (!dbNext) throw new Error("Task cannot be advanced");

    await prisma.housekeepingTask.update({
      where: { id: data.taskId },
      data: {
        status: dbNext,
        completedAt: dbNext === "DONE" ? new Date() : null,
      },
    });

    if (dbNext === "DONE") {
      await prisma.room.update({
        where: { id: dbTask.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    return { success: true as const, newStatus: dbNext };
  });

export const assignHousekeepingTask = createServerFn({ method: "POST" })
  .inputValidator(assignTaskSchema)
  .handler(async ({ data }) => {
    await requireAction("assignHousekeepingTask");

    await prisma.housekeepingTask.update({
      where: { id: data.taskId },
      data: { assignedToId: data.assignedToId },
    });
    return { success: true as const };
  });
