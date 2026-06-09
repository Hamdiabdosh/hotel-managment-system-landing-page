import { prisma } from "@/lib/prisma";
import type { ReservationStatus } from "@/lib/types";

export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string,
): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      roomId,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
    },
  });
  return conflict === null;
}

export async function getTodayArrivals(hotelId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.reservation.findMany({
    where: {
      hotelId,
      checkIn: { gte: today, lt: tomorrow },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: { guest: true, room: true },
    orderBy: { checkIn: "asc" },
  });
}

export async function getTodayDepartures(hotelId: string) {
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
    include: { guest: true, room: true },
    orderBy: { checkOut: "asc" },
  });
}

export async function getDashboardKpis(hotelId: string) {
  const [totalRooms, occupiedRooms, todayArrivals, todayDepartures] = await Promise.all([
    prisma.room.count({ where: { hotelId } }),
    prisma.room.count({ where: { hotelId, status: "OCCUPIED" } }),
    getTodayArrivals(hotelId),
    getTodayDepartures(hotelId),
  ]);

  const revenueToday = todayArrivals.reduce((sum, r) => sum + r.totalAmount, 0);

  return {
    occupancyPct: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    arrivalsCount: todayArrivals.length,
    departuresCount: todayDepartures.length,
    revenueToday,
  };
}

export const VALID_STATUS_TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CANCELLED: ["CONFIRMED"],
};

export function assertValidTransition(current: ReservationStatus, next: ReservationStatus): void {
  const allowed = VALID_STATUS_TRANSITIONS[current];
  if (!allowed?.includes(next)) {
    throw new Error(`Invalid status transition: ${current} → ${next}`);
  }
}
