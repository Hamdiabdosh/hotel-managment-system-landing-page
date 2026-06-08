import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTier } from "@/lib/loyalty";
import { eachDayInRange } from "@/lib/format";
import { MOCK_GUESTS, MOCK_RESERVATIONS, MOCK_ROOMS } from "@/lib/mock-data";
import type {
  DateRange,
  OccupancyByTypeDataPoint,
  ReportData,
  ReservationSource,
  ReservationStatus,
  RevenueBySourceDataPoint,
  TopGuestRow,
} from "@/lib/types";

const reportInputSchema = z.object({
  hotelId: z.string(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const VALID_STATUSES: ReservationStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

type ReportReservation = {
  guestId: string;
  guest: { firstName: string; lastName: string; loyaltyPoints: number };
  room: { type: string };
  checkIn: Date | string;
  checkOut: Date | string;
  totalAmount: number;
  source: ReservationSource | string;
  status: ReservationStatus | string;
};

function dayString(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

function nightsForReservation(r: ReportReservation): number {
  const ci = new Date(dayString(r.checkIn)).getTime();
  const co = new Date(dayString(r.checkOut)).getTime();
  return Math.max(0, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
}

function computeReportData(params: {
  from: string;
  to: string;
  totalRooms: number;
  reservations: ReportReservation[];
  newGuests: number;
  roomsByType: { type: string; count: number }[];
}): ReportData {
  const { from, to, totalRooms, reservations, newGuests, roomsByType } = params;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const totalRevenue = reservations.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalNightsSold = reservations.reduce((sum, r) => sum + nightsForReservation(r), 0);
  const rangeDays = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );

  const occupancyPct =
    totalRooms > 0 ? Math.round((totalNightsSold / (totalRooms * rangeDays)) * 100) : 0;
  const adr = reservations.length > 0 ? Math.round(totalRevenue / reservations.length) : 0;
  const revPAR = totalRooms > 0 ? Math.round(totalRevenue / (totalRooms * rangeDays)) : 0;

  const occupancyOverTime = eachDayInRange(from, to).map((day) => {
    const dayDate = new Date(day);
    const occupied = reservations.filter((r) => {
      const ci = new Date(dayString(r.checkIn));
      const co = new Date(dayString(r.checkOut));
      return ci <= dayDate && dayDate < co;
    }).length;
    return {
      date: day,
      occupancyPct:
        totalRooms > 0 ? Math.min(100, Math.round((occupied / totalRooms) * 100)) : 0,
    };
  });

  const revenueByDay = new Map<string, number>();
  for (const day of eachDayInRange(from, to)) {
    revenueByDay.set(day, 0);
  }
  for (const r of reservations) {
    const day = dayString(r.checkIn);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + r.totalAmount);
  }
  const revenueOverTime = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  const sourceMap = new Map<string, RevenueBySourceDataPoint>();
  for (const r of reservations) {
    const source = String(r.source);
    const existing = sourceMap.get(source) ?? { source, revenue: 0, bookings: 0 };
    existing.revenue += r.totalAmount;
    existing.bookings += 1;
    sourceMap.set(source, existing);
  }
  const revenueBySource = Array.from(sourceMap.values()).sort((a, b) => b.revenue - a.revenue);

  const occupancyByType: OccupancyByTypeDataPoint[] = roomsByType.map((rt) => {
    const occupiedCount = reservations.filter(
      (r) => r.room.type === rt.type && r.status === "CHECKED_IN",
    ).length;
    return {
      type: rt.type,
      occupancyPct: rt.count > 0 ? Math.round((occupiedCount / rt.count) * 100) : 0,
      totalRooms: rt.count,
    };
  });

  const guestSpendMap = new Map<
    string,
    { name: string; stays: number; spend: number; points: number }
  >();
  for (const r of reservations) {
    const existing = guestSpendMap.get(r.guestId) ?? {
      name: `${r.guest.firstName} ${r.guest.lastName}`,
      stays: 0,
      spend: 0,
      points: r.guest.loyaltyPoints,
    };
    existing.stays += 1;
    existing.spend += r.totalAmount;
    guestSpendMap.set(r.guestId, existing);
  }

  const topGuests: TopGuestRow[] = Array.from(guestSpendMap.entries())
    .map(([guestId, v]) => ({
      guestId,
      guestName: v.name,
      totalStays: v.stays,
      totalSpend: v.spend,
      loyaltyPoints: v.points,
      loyaltyTier: getTier(v.points),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10);

  return {
    kpis: {
      occupancyPct,
      revPAR,
      adr,
      totalRevenue,
      newGuests,
      totalRooms,
    },
    occupancyOverTime,
    revenueOverTime,
    revenueBySource,
    occupancyByType,
    topGuests,
  };
}

export function buildMockReportData(range: DateRange): ReportData {
  const reservations: ReportReservation[] = MOCK_RESERVATIONS.filter((r) => {
    if (!VALID_STATUSES.includes(r.status)) return false;
    return r.checkIn >= range.from && r.checkIn <= range.to;
  }).map((r) => {
    const guest = MOCK_GUESTS.find((g) => g.id === r.guestId);
    return {
      guestId: r.guestId,
      guest: {
        firstName: guest?.firstName ?? r.guestName.split(" ")[0] ?? "Guest",
        lastName: guest?.lastName ?? r.guestName.split(" ").slice(1).join(" ") ?? "",
        loyaltyPoints: guest?.loyaltyPoints ?? 0,
      },
      room: { type: r.roomType },
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      totalAmount: r.totalAmount,
      source: r.source,
      status: r.status,
    };
  });

  const typeCounts = new Map<string, number>();
  for (const room of MOCK_ROOMS) {
    typeCounts.set(room.typeName, (typeCounts.get(room.typeName) ?? 0) + 1);
  }
  const roomsByType = Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count }));

  const guestIdsInRange = new Set(reservations.map((r) => r.guestId));
  const newGuests = MOCK_GUESTS.filter(
    (g) => guestIdsInRange.has(g.id) && g.totalStays <= 1,
  ).length;

  return computeReportData({
    from: range.from,
    to: range.to,
    totalRooms: MOCK_ROOMS.length,
    reservations,
    newGuests,
    roomsByType,
  });
}

export const getReportData = createServerFn({ method: "GET" })
  .inputValidator(reportInputSchema)
  .handler(async ({ data }) => {
    try {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      toDate.setHours(23, 59, 59, 999);

      const [totalRooms, reservations, newGuests, roomsByTypeRows] = await Promise.all([
        prisma.room.count({ where: { hotelId: data.hotelId } }),
        prisma.reservation.findMany({
          where: {
            hotelId: data.hotelId,
            status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
            checkIn: { gte: fromDate, lte: toDate },
          },
          include: { guest: true, room: true },
        }),
        prisma.guest.count({
          where: {
            hotelId: data.hotelId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.room.groupBy({
          by: ["type"],
          where: { hotelId: data.hotelId },
          _count: { id: true },
        }),
      ]);

      const roomsByType = roomsByTypeRows.map((rt) => ({
        type: rt.type,
        count: rt._count.id,
      }));

      return computeReportData({
        from: data.from,
        to: data.to,
        totalRooms,
        reservations,
        newGuests,
        roomsByType,
      });
    } catch (err) {
      console.warn("[reports] DB unavailable, using mock data:", err);
      return buildMockReportData({ from: data.from, to: data.to });
    }
  });
