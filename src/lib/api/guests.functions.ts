import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction, requireSessionUser } from "@/lib/auth/session.server";
import { getTier, earnPointsForStay, TIER_THRESHOLDS } from "@/lib/loyalty";
import { nightsBetween } from "@/lib/format";
import { MOCK_GUESTS, MOCK_RESERVATIONS } from "@/lib/mock-data";
import type {
  Guest,
  GuestDetail,
  GuestStaySummary,
  LoyaltyLedgerEntry,
  LoyaltyTier,
  ReservationStatus,
} from "@/lib/types";

const loyaltyTierSchema = z.enum(["Bronze", "Silver", "Gold", "Platinum"]);

const listGuestsSchema = z.object({
  hotelId: z.string(),
  query: z.string().optional(),
  nationality: z.string().optional(),
  tier: loyaltyTierSchema.optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(200).default(20),
});

const guestIdSchema = z.object({ id: z.string() });

const createGuestSchema = z.object({
  hotelId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  nationality: z.string().min(1),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  preferences: z.record(z.string()).optional(),
});

const updatePreferencesSchema = z.object({
  id: z.string(),
  preferences: z.record(z.string()),
  notes: z.string().optional(),
});

const adjustLoyaltySchema = z.object({
  id: z.string(),
  hotelId: z.string(),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "Delta cannot be zero"),
  reason: z.string().min(1),
});

const awardStayPointsSchema = z.object({
  guestId: z.string(),
  hotelId: z.string(),
  reservationId: z.string(),
});

function tierLoyaltyPointsFilter(tier: LoyaltyTier) {
  switch (tier) {
    case "Platinum":
      return { gte: TIER_THRESHOLDS.Platinum };
    case "Gold":
      return { gte: TIER_THRESHOLDS.Gold, lt: TIER_THRESHOLDS.Platinum };
    case "Silver":
      return { gte: TIER_THRESHOLDS.Silver, lt: TIER_THRESHOLDS.Gold };
    case "Bronze":
      return { lt: TIER_THRESHOLDS.Silver };
  }
}

function mapPrismaGuest(row: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  idType: string | null;
  idNumber: string | null;
  dateOfBirth: Date | null;
  preferences: unknown;
  totalStays: number;
  loyaltyPoints: number;
}): Guest {
  const prefs = row.preferences as Record<string, string> | null | undefined;
  const { staffNotes, ...preferences } = prefs ?? {};
  const hasPrefs = Object.keys(preferences).length > 0;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    idType: row.idType ?? undefined,
    idNumber: row.idNumber ?? undefined,
    dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10),
    preferences: hasPrefs ? preferences : undefined,
    totalStays: row.totalStays,
    loyaltyPoints: row.loyaltyPoints,
    loyaltyTier: getTier(row.loyaltyPoints),
    notes: staffNotes,
  };
}

function mapReservationToStaySummary(r: {
  id: string;
  checkIn: Date;
  checkOut: Date;
  totalAmount: number;
  status: ReservationStatus;
  room: { number: string; type: string };
}): GuestStaySummary {
  const checkIn = r.checkIn.toISOString().slice(0, 10);
  const checkOut = r.checkOut.toISOString().slice(0, 10);
  return {
    reservationId: r.id,
    code: `BK-${r.id.slice(-5).toUpperCase()}`,
    roomNumber: r.room.number,
    roomType: r.room.type,
    checkIn,
    checkOut,
    nights: nightsBetween(checkIn, checkOut),
    totalAmount: r.totalAmount,
    status: r.status,
  };
}

function mapMockReservationToStay(r: (typeof MOCK_RESERVATIONS)[number]): GuestStaySummary {
  return {
    reservationId: r.id,
    code: r.code,
    roomNumber: r.roomNumber,
    roomType: r.roomType,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    nights: r.nights,
    totalAmount: r.totalAmount,
    status: r.status,
  };
}

function mapAuditLogToLedgerEntry(log: {
  id: string;
  after: unknown;
  createdAt: Date;
}): LoyaltyLedgerEntry | null {
  const after = log.after as {
    points?: number;
    earned?: number;
    delta?: number;
    reason?: string;
  } | null;
  if (!after) return null;

  const delta =
    after.earned ??
    (typeof after.delta === "number"
      ? after.delta
      : typeof after.points === "number"
        ? after.points
        : null);
  if (delta === null) return null;

  return {
    id: log.id,
    delta,
    reason: after.reason ?? "Loyalty adjustment",
    createdAt: log.createdAt.toISOString(),
    balanceAfter: typeof after.points === "number" ? after.points : 0,
  };
}

function filterMockGuests(params: {
  query?: string;
  nationality?: string;
  tier?: LoyaltyTier;
}): Guest[] {
  return MOCK_GUESTS.filter((g) => {
    if (params.nationality && g.nationality !== params.nationality) return false;
    if (params.tier && getTier(g.loyaltyPoints) !== params.tier) return false;
    if (!params.query) return true;
    const lower = params.query.toLowerCase();
    return (
      g.firstName.toLowerCase().includes(lower) ||
      g.lastName.toLowerCase().includes(lower) ||
      g.email.toLowerCase().includes(lower)
    );
  }).map((g) => ({ ...g, loyaltyTier: getTier(g.loyaltyPoints) }));
}

async function applyLoyaltyDelta(params: {
  guestId: string;
  hotelId: string;
  userId: string;
  delta: number;
  reason: string;
  currentPoints: number;
}) {
  const newPoints = params.currentPoints + params.delta;

  await prisma.$transaction([
    prisma.guest.update({
      where: { id: params.guestId },
      data: { loyaltyPoints: { increment: params.delta } },
    }),
    prisma.auditLog.create({
      data: {
        hotelId: params.hotelId,
        userId: params.userId,
        action: "LOYALTY_ADJUST",
        entity: "LoyaltyPoints",
        entityId: params.guestId,
        before: { points: params.currentPoints },
        after: { points: newPoints, reason: params.reason },
      },
    }),
  ]);

  return { newPoints, newTier: getTier(newPoints) };
}

export const listGuests = createServerFn({ method: "GET" })
  .inputValidator(listGuestsSchema)
  .handler(async ({ data }) => {
    const page = data.page ?? 0;
    const pageSize = data.pageSize ?? 20;

    try {
      const where = {
        hotelId: data.hotelId,
        ...(data.nationality ? { nationality: data.nationality } : {}),
        ...(data.tier ? { loyaltyPoints: tierLoyaltyPointsFilter(data.tier) } : {}),
        ...(data.query
          ? {
              OR: [
                { firstName: { contains: data.query, mode: "insensitive" as const } },
                { lastName: { contains: data.query, mode: "insensitive" as const } },
                { email: { contains: data.query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.guest.findMany({
          where,
          skip: page * pageSize,
          take: pageSize,
          orderBy: { lastName: "asc" },
        }),
        prisma.guest.count({ where }),
      ]);

      return {
        guests: rows.map(mapPrismaGuest),
        total,
        page,
        pageSize,
      };
    } catch (err) {
      console.warn("[guests] DB unavailable, using mock data:", err);
      const filtered = filterMockGuests({
        query: data.query,
        nationality: data.nationality,
        tier: data.tier,
      });
      return {
        guests: filtered.slice(page * pageSize, (page + 1) * pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    }
  });

export const searchGuests = createServerFn({ method: "GET" })
  .inputValidator(z.object({ hotelId: z.string(), query: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireSessionUser();
    return prisma.guest.findMany({
      where: {
        hotelId: data.hotelId,
        OR: [
          { firstName: { contains: data.query, mode: "insensitive" } },
          { lastName: { contains: data.query, mode: "insensitive" } },
          { email: { contains: data.query, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 10,
      orderBy: { lastName: "asc" },
    });
  });

export const getGuestDetail = createServerFn({ method: "GET" })
  .inputValidator(guestIdSchema)
  .handler(async ({ data }) => {
    try {
      const g = await prisma.guest.findUniqueOrThrow({
        where: { id: data.id },
        include: {
          reservations: {
            include: { room: true },
            orderBy: { checkIn: "desc" },
            take: 20,
          },
        },
      });

      const ledgerRows = await prisma.auditLog.findMany({
        where: { entity: "LoyaltyPoints", entityId: g.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const mapped = mapPrismaGuest(g);
      const ledger = ledgerRows
        .map(mapAuditLogToLedgerEntry)
        .filter((entry): entry is LoyaltyLedgerEntry => entry !== null);

      return {
        ...mapped,
        stays: g.reservations.map(mapReservationToStaySummary),
        loyaltyTier: getTier(g.loyaltyPoints),
        ledger,
      } satisfies GuestDetail;
    } catch (err) {
      console.warn("[guests] DB unavailable, using mock data:", err);
      const guest = MOCK_GUESTS.find((g) => g.id === data.id);
      if (!guest) throw new Error("Guest not found");
      const stays = MOCK_RESERVATIONS.filter((r) => r.guestId === guest.id).map(
        mapMockReservationToStay,
      );
      return {
        ...guest,
        loyaltyTier: getTier(guest.loyaltyPoints),
        stays,
        ledger: [],
      } satisfies GuestDetail;
    }
  });

export const createGuest = createServerFn({ method: "POST" })
  .inputValidator(createGuestSchema)
  .handler(async ({ data }) => {
    await requireAction("createGuest");

    try {
      const existing = await prisma.guest.findFirst({
        where: { hotelId: data.hotelId, email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new Error("A guest with this email already exists");
      }

      const created = await prisma.guest.create({
        data: {
          hotelId: data.hotelId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          nationality: data.nationality,
          idType: data.idType,
          idNumber: data.idNumber,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          preferences: data.preferences ?? undefined,
        },
      });

      return mapPrismaGuest(created);
    } catch (err) {
      if (err instanceof Error && err.message === "A guest with this email already exists") {
        throw err;
      }
      console.warn("[guests] DB unavailable, using mock data:", err);
      return {
        id: `guest_mock_${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        nationality: data.nationality,
        idType: data.idType,
        idNumber: data.idNumber,
        dateOfBirth: data.dateOfBirth,
        preferences: data.preferences,
        totalStays: 0,
        loyaltyPoints: 0,
        loyaltyTier: "Bronze" as const,
      } satisfies Guest;
    }
  });

export const updateGuestPreferences = createServerFn({ method: "POST" })
  .inputValidator(updatePreferencesSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("editGuestPreferences");

    try {
      const current = await prisma.guest.findUniqueOrThrow({ where: { id: data.id } });
      const preferences = {
        ...data.preferences,
        ...(data.notes ? { staffNotes: data.notes } : {}),
      };

      const updated = await prisma.$transaction(async (tx) => {
        const guest = await tx.guest.update({
          where: { id: data.id },
          data: { preferences },
        });

        await tx.auditLog.create({
          data: {
            hotelId: current.hotelId,
            userId: actor.userId,
            action: "UPDATE_PREFERENCES",
            entity: "Guest",
            entityId: data.id,
          },
        });

        return guest;
      });

      return mapPrismaGuest(updated);
    } catch (err) {
      console.warn("[guests] DB unavailable, using mock data:", err);
      const guest = MOCK_GUESTS.find((g) => g.id === data.id);
      if (!guest) throw new Error("Guest not found");
      return {
        ...guest,
        preferences: data.preferences,
        notes: data.notes ?? guest.notes,
        loyaltyTier: getTier(guest.loyaltyPoints),
      };
    }
  });

export const adjustLoyaltyPoints = createServerFn({ method: "POST" })
  .inputValidator(adjustLoyaltySchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("adjustLoyaltyPoints");

    try {
      const current = await prisma.guest.findUniqueOrThrow({ where: { id: data.id } });
      if (data.delta < 0 && Math.abs(data.delta) > current.loyaltyPoints) {
        throw new Error("Insufficient loyalty points");
      }

      return await applyLoyaltyDelta({
        guestId: data.id,
        hotelId: data.hotelId,
        userId: actor.userId,
        delta: data.delta,
        reason: data.reason,
        currentPoints: current.loyaltyPoints,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "Insufficient loyalty points") {
        throw err;
      }
      console.warn("[guests] DB unavailable, using mock data:", err);
      const guest = MOCK_GUESTS.find((g) => g.id === data.id);
      if (!guest) throw new Error("Guest not found");
      const newPoints = Math.max(0, guest.loyaltyPoints + data.delta);
      return { newPoints, newTier: getTier(newPoints) };
    }
  });

export const awardStayPoints = createServerFn({ method: "POST" })
  .inputValidator(awardStayPointsSchema)
  .handler(async ({ data }) => {
    const actor = await requireSessionUser();

    try {
      const reservation = await prisma.reservation.findUniqueOrThrow({
        where: { id: data.reservationId },
      });
      const checkIn = reservation.checkIn.toISOString().slice(0, 10);
      const checkOut = reservation.checkOut.toISOString().slice(0, 10);
      const nights = nightsBetween(checkIn, checkOut);
      const earned = earnPointsForStay(nights, reservation.totalAmount);

      const guest = await prisma.guest.findUniqueOrThrow({ where: { id: data.guestId } });

      const result = await applyLoyaltyDelta({
        guestId: data.guestId,
        hotelId: data.hotelId,
        userId: actor.userId,
        delta: earned,
        reason: `Stay reward — reservation ${data.reservationId}`,
        currentPoints: guest.loyaltyPoints,
      });

      return { earned, ...result };
    } catch (err) {
      console.warn("[guests] DB unavailable, using mock data:", err);
      const guest = MOCK_GUESTS.find((g) => g.id === data.guestId);
      const reservation = MOCK_RESERVATIONS.find((r) => r.id === data.reservationId);
      const earned = reservation
        ? earnPointsForStay(reservation.nights, reservation.totalAmount)
        : 100;
      const newPoints = Math.max(0, (guest?.loyaltyPoints ?? 0) + earned);
      return { earned, newPoints, newTier: getTier(newPoints) };
    }
  });
