import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTodayArrivals, getTodayDepartures } from "@/lib/api/reservations.queries";
import { MOCK_RESERVATIONS, MOCK_ROOMS, OCCUPANCY_7D, REVENUE_BY_TYPE } from "@/lib/mock-data";
import { nightsBetween } from "@/lib/format";
import type { Reservation, ReservationSource, ReservationStatus, Room, RoomStatus } from "@/lib/types";

const hotelIdSchema = z.object({ hotelId: z.string() });

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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
}): Reservation {
  const checkIn = r.checkIn.toISOString().slice(0, 10);
  const checkOut = r.checkOut.toISOString().slice(0, 10);
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
  };
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

async function getOccupancy7d(hotelId: string, totalRooms: number) {
  const points: { day: string; occupancy: number }[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - offset);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const occupied =
      offset === 0
        ? await prisma.room.count({ where: { hotelId, status: "OCCUPIED" } })
        : await prisma.reservation.count({
            where: {
              hotelId,
              status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
              checkIn: { lt: dayEnd },
              checkOut: { gt: dayStart },
            },
          });

    points.push({
      day: DAY_LABELS[dayStart.getDay()]!,
      occupancy: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
    });
  }

  return points;
}

async function getRevenueByType(hotelId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const reservations = await prisma.reservation.findMany({
    where: {
      hotelId,
      checkIn: { gte: weekAgo },
      status: { in: ["CHECKED_IN", "CHECKED_OUT", "CONFIRMED"] },
    },
    include: { room: true },
  });

  const totals = new Map<string, number>();
  for (const r of reservations) {
    totals.set(r.room.type, (totals.get(r.room.type) ?? 0) + r.totalAmount);
  }

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export const getDashboardHomeData = createServerFn({ method: "GET" })
  .inputValidator(hotelIdSchema)
  .handler(async ({ data }) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalRooms, occupiedRooms, todayArrivals, todayDepartures, checkedInToday, hkSnapshot, occupancy7d, revenueByType] =
        await Promise.all([
          prisma.room.count({ where: { hotelId: data.hotelId } }),
          prisma.room.count({ where: { hotelId: data.hotelId, status: "OCCUPIED" } }),
          getTodayArrivals(data.hotelId),
          getTodayDepartures(data.hotelId),
          prisma.reservation.findMany({
            where: {
              hotelId: data.hotelId,
              status: "CHECKED_IN",
              checkIn: { gte: today, lt: tomorrow },
            },
          }),
          prisma.room.findMany({
            where: {
              hotelId: data.hotelId,
              status: { in: ["CLEANING", "INSPECTING", "MAINTENANCE"] },
            },
            orderBy: { number: "asc" },
            take: 5,
          }),
          prisma.room.count({ where: { hotelId: data.hotelId } }).then((count) =>
            getOccupancy7d(data.hotelId, count),
          ),
          getRevenueByType(data.hotelId),
        ]);

      const revenueToday = checkedInToday.reduce((sum, r) => sum + r.totalAmount, 0);

      return {
        kpis: {
          occupancyPct: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
          arrivalsCount: todayArrivals.length,
          departuresCount: todayDepartures.length,
          revenueToday,
        },
        arrivals: todayArrivals.map(mapPrismaReservation).slice(0, 5),
        housekeepingSnapshot: hkSnapshot.map(mapPrismaRoom),
        occupancy7d,
        revenueByType,
      };
    } catch (err) {
      console.warn("[dashboard] DB unavailable, using mock data:", err);
      const todayStr = new Date().toISOString().slice(0, 10);
      const occupiedCount = MOCK_ROOMS.filter((r) => r.status === "OCCUPIED").length;
      const arrivalsToday = MOCK_RESERVATIONS.filter(
        (r) => (r.status === "CONFIRMED" || r.status === "PENDING") && r.checkIn === todayStr,
      );
      const departuresToday = MOCK_RESERVATIONS.filter(
        (r) => r.status === "CHECKED_IN" && r.checkOut === todayStr,
      );
      const revenueToday = MOCK_RESERVATIONS.filter(
        (r) => r.status === "CHECKED_IN" && r.checkIn === todayStr,
      ).reduce((sum, r) => sum + r.totalAmount, 0);

      return {
        kpis: {
          occupancyPct: Math.round((occupiedCount / MOCK_ROOMS.length) * 100),
          arrivalsCount: arrivalsToday.length,
          departuresCount: departuresToday.length,
          revenueToday,
        },
        arrivals: arrivalsToday.slice(0, 5),
        housekeepingSnapshot: MOCK_ROOMS.filter((r) =>
          ["CLEANING", "INSPECTING", "MAINTENANCE"].includes(r.status),
        ).slice(0, 5),
        occupancy7d: OCCUPANCY_7D,
        revenueByType: REVENUE_BY_TYPE,
      };
    }
  });
