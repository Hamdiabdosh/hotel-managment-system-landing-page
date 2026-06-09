import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { nightsBetween } from "@/lib/format";
import { sendReservationConfirmation } from "@/lib/email";
import { assertValidTransition, isRoomAvailable } from "@/lib/api/reservations.queries";
import type { Folio, Guest, Reservation, ReservationSource, ReservationStatus } from "@/lib/types";

const reservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
]);

const reservationSourceSchema = z.enum([
  "DIRECT",
  "BOOKING_COM",
  "AIRBNB",
  "EXPEDIA",
  "PHONE",
  "WALKIN",
]);

const listReservationsSchema = z.object({
  hotelId: z.string(),
  status: reservationStatusSchema.optional(),
  source: reservationSourceSchema.optional(),
  roomType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  query: z.string().optional(),
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(500).optional(),
});

const getReservationSchema = z.object({ id: z.string() });

const createReservationSchema = z.object({
  hotelId: z.string(),
  guestId: z.string(),
  roomId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(10).default(0),
  source: reservationSourceSchema,
  specialRequests: z.string().optional(),
  depositAmount: z.number().min(0).default(0),
});

const updateReservationStatusSchema = z.object({
  id: z.string(),
  status: reservationStatusSchema,
  notes: z.string().optional(),
});

const cancelReservationSchema = z.object({
  id: z.string(),
  reason: z.string().optional(),
});

const updateReservationSchema = z.object({
  id: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(10),
  specialRequests: z.string().optional(),
  priceOverride: z.number().min(0).optional(),
});

function toReservationCode(id: string): string {
  return `BK-${id.slice(-5).toUpperCase()}`;
}

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
  folios?: { totalAmount: number; paidAmount: number }[];
}): Reservation {
  const checkIn = r.checkIn.toISOString().slice(0, 10);
  const checkOut = r.checkOut.toISOString().slice(0, 10);
  const folio = r.folios?.[0];
  return {
    id: r.id,
    code: toReservationCode(r.id),
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
  };
}

export const listReservations = createServerFn({ method: "GET" })
  .inputValidator(listReservationsSchema)
  .handler(async ({ data }) => {
    const page = data.page ?? 0;
    const pageSize = data.pageSize ?? 10;

    const where = {
      hotelId: data.hotelId,
      ...(data.status ? { status: data.status } : {}),
      ...(data.source ? { source: data.source } : {}),
      ...(data.roomType && data.roomType !== "ALL" ? { room: { type: data.roomType } } : {}),
      ...(data.dateFrom ? { checkIn: { gte: new Date(data.dateFrom) } } : {}),
      ...(data.dateTo ? { checkOut: { lte: new Date(data.dateTo) } } : {}),
      ...(data.query
        ? {
            OR: [
              { guest: { firstName: { contains: data.query, mode: "insensitive" as const } } },
              { guest: { lastName: { contains: data.query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          guest: true,
          room: true,
          folios: { select: { totalAmount: true, paidAmount: true }, take: 1 },
        },
        skip: page * pageSize,
        take: pageSize,
        orderBy: { checkIn: "desc" },
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      reservations: rows.map(mapPrismaReservation),
      total,
      page,
      pageSize,
    };
  });

export const getReservation = createServerFn({ method: "GET" })
  .inputValidator(getReservationSchema)
  .handler(async ({ data }) => {
    const row = await prisma.reservation.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        guest: true,
        room: true,
        folios: { include: { items: true, payments: true } },
      },
    });

    const reservation = mapPrismaReservation(row);
    const guest: Guest = {
      id: row.guest.id,
      firstName: row.guest.firstName,
      lastName: row.guest.lastName,
      email: row.guest.email,
      phone: row.guest.phone,
      nationality: row.guest.nationality,
      idType: row.guest.idType ?? undefined,
      idNumber: row.guest.idNumber ?? undefined,
      dateOfBirth: row.guest.dateOfBirth?.toISOString().slice(0, 10),
      preferences: row.guest.preferences as Record<string, string> | undefined,
      totalStays: row.guest.totalStays,
      loyaltyPoints: row.guest.loyaltyPoints,
    };

    const prismaFolio = row.folios[0];
    let folio: Folio | undefined;
    if (prismaFolio) {
      folio = {
        id: prismaFolio.id,
        reservationId: row.id,
        guestName: reservation.guestName,
        roomNumber: reservation.roomNumber,
        items: prismaFolio.items.map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          category: item.category,
          createdAt: item.createdAt.toISOString().slice(0, 10),
        })),
        payments: prismaFolio.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference ?? "",
          status: p.status,
          createdAt: p.createdAt.toISOString().slice(0, 10),
        })),
        totalAmount: prismaFolio.totalAmount,
        paidAmount: prismaFolio.paidAmount,
        status: prismaFolio.status,
      };
    }

    return { reservation, guest, folio, roomPricePerNight: row.room.pricePerNight };
  });

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator(createReservationSchema)
  .handler(async ({ data }) => {
    await requireAction("createReservation");

    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      throw new Error("Check-out must be after check-in");
    }

    const nights = nightsBetween(data.checkIn, data.checkOut);
    const room = await prisma.room.findUniqueOrThrow({ where: { id: data.roomId } });
    const available = await isRoomAvailable(
      data.roomId,
      new Date(data.checkIn),
      new Date(data.checkOut),
    );
    if (!available) throw new Error("Room is not available for the selected dates");

    const totalAmount = room.pricePerNight * nights;

    const created = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          hotelId: data.hotelId,
          guestId: data.guestId,
          roomId: data.roomId,
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          adults: data.adults,
          children: data.children,
          status: "CONFIRMED",
          source: data.source,
          totalAmount,
          depositAmount: data.depositAmount,
          specialRequests: data.specialRequests,
        },
        include: { guest: true, room: true },
      });

      await tx.folio.create({
        data: {
          reservationId: reservation.id,
          totalAmount,
          paidAmount: data.depositAmount,
          status: "OPEN",
          items: {
            create: {
              description: `Room charge — ${nights} night${nights === 1 ? "" : "s"}`,
              amount: totalAmount,
              category: "ROOM",
            },
          },
        },
      });

      return reservation;
    });

    try {
      const [guest, hotelRecord] = await Promise.all([
        prisma.guest.findUnique({ where: { id: data.guestId } }),
        prisma.hotel.findUnique({
          where: { id: data.hotelId },
          select: { name: true, config: true },
        }),
      ]);
      if (guest) {
        const hotelConfig = hotelRecord?.config as { currency?: string } | null;
        await sendReservationConfirmation({
          to: guest.email,
          guestName: `${guest.firstName} ${guest.lastName}`,
          hotelName: hotelRecord?.name ?? "Hotel",
          code: toReservationCode(created.id),
          roomType: room.type,
          roomNumber: room.number,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          nights,
          totalAmount,
          currency: hotelConfig?.currency ?? "USD",
        });
      }
    } catch (emailErr) {
      console.warn("[reservations] Failed to send confirmation email:", emailErr);
    }

    return mapPrismaReservation(created);
  });

export const updateReservation = createServerFn({ method: "POST" })
  .inputValidator(updateReservationSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("updateReservationStatus");
    const current = await prisma.reservation.findUniqueOrThrow({
      where: { id: data.id },
      include: { room: true },
    });

    if (["CHECKED_OUT", "CANCELLED", "NO_SHOW"].includes(current.status)) {
      throw new Error("Cannot edit a completed or cancelled reservation");
    }

    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      throw new Error("Check-out must be after check-in");
    }

    const datesChanged =
      current.checkIn.toISOString().slice(0, 10) !== data.checkIn ||
      current.checkOut.toISOString().slice(0, 10) !== data.checkOut;

    if (datesChanged) {
      const available = await isRoomAvailable(
        current.roomId,
        new Date(data.checkIn),
        new Date(data.checkOut),
        data.id,
      );
      if (!available) throw new Error("Room is not available for the new dates");
    }

    const nights = nightsBetween(data.checkIn, data.checkOut);
    const newTotal = data.priceOverride ?? current.room.pricePerNight * nights;

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: data.id },
        data: {
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          adults: data.adults,
          children: data.children,
          specialRequests: data.specialRequests ?? null,
          totalAmount: newTotal,
        },
      });
      const folio = await tx.folio.findFirst({ where: { reservationId: data.id } });
      if (folio) {
        await tx.folio.update({
          where: { id: folio.id },
          data: { totalAmount: newTotal },
        });
        const roomItem = await tx.folioItem.findFirst({
          where: { folioId: folio.id, category: "ROOM" },
        });
        if (roomItem) {
          await tx.folioItem.update({
            where: { id: roomItem.id },
            data: {
              description: `Room charge — ${nights} night${nights === 1 ? "" : "s"}`,
              amount: newTotal,
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          hotelId: current.hotelId,
          userId: actor.userId,
          action: "RESERVATION_EDIT",
          entity: "Reservation",
          entityId: data.id,
          before: {
            checkIn: current.checkIn,
            checkOut: current.checkOut,
            totalAmount: current.totalAmount,
          },
          after: { checkIn: data.checkIn, checkOut: data.checkOut, totalAmount: newTotal },
        },
      });
    });

    return { success: true as const };
  });

export const updateReservationStatus = createServerFn({ method: "POST" })
  .inputValidator(updateReservationStatusSchema)
  .handler(async ({ data }) => {
    const current = await prisma.reservation.findUniqueOrThrow({ where: { id: data.id } });
    assertValidTransition(current.status as ReservationStatus, data.status);

    const actor = await requireAction("updateReservationStatus");

    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id: data.id },
        data: { status: data.status },
        include: { guest: true, room: true },
      });

      await tx.auditLog.create({
        data: {
          hotelId: current.hotelId,
          userId: actor.userId,
          action: "STATUS_CHANGE",
          entity: "Reservation",
          entityId: data.id,
          before: { status: current.status },
          after: { status: data.status, notes: data.notes },
        },
      });

      return reservation;
    });

    return mapPrismaReservation(updated);
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .inputValidator(cancelReservationSchema)
  .handler(async ({ data }) => {
    const current = await prisma.reservation.findUniqueOrThrow({ where: { id: data.id } });
    assertValidTransition(current.status as ReservationStatus, "CANCELLED");
    const actor = await requireAction("cancelReservation");

    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id: data.id },
        data: { status: "CANCELLED" },
        include: { guest: true, room: true },
      });

      await tx.auditLog.create({
        data: {
          hotelId: current.hotelId,
          userId: actor.userId,
          action: "STATUS_CHANGE",
          entity: "Reservation",
          entityId: data.id,
          before: { status: current.status },
          after: { status: "CANCELLED", reason: data.reason },
        },
      });

      return reservation;
    });

    return mapPrismaReservation(updated);
  });
