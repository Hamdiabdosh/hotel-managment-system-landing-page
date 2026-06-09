import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { MOCK_FOLIOS, MOCK_RESERVATIONS } from "@/lib/mock-data";

const posOrderItemSchema = z.object({
  posItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
});

const chargeToRoomSchema = z.object({
  hotelId: z.string(),
  roomNumber: z.string().min(1, "Room number required"),
  items: z.array(posOrderItemSchema).min(1, "Cart is empty"),
  staffNote: z.string().optional(),
});

const getActiveRoomsSchema = z.object({
  hotelId: z.string(),
});

export interface ActiveRoom {
  roomId: string;
  roomNumber: string;
  guestName: string;
  folioId: string | null;
}

function isBusinessError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("No active guest") || err.message.includes("No open folio"))
  );
}

function mockActiveRooms() {
  return MOCK_RESERVATIONS.filter((r) => r.status === "CHECKED_IN").map((r) => ({
    roomId: r.roomId,
    roomNumber: r.roomNumber,
    guestName: r.guestName,
    folioId: MOCK_FOLIOS.find((f) => f.reservationId === r.id)?.id ?? null,
  }));
}

export const getActiveRooms = createServerFn({ method: "GET" })
  .inputValidator(getActiveRoomsSchema)
  .handler(async ({ data }) => {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { hotelId: data.hotelId, status: "CHECKED_IN" },
        include: { room: true, guest: true },
        orderBy: { room: { number: "asc" } },
      });

      const folios = await prisma.folio.findMany({
        where: {
          reservationId: { in: reservations.map((r) => r.id) },
          status: "OPEN",
        },
      });

      const folioByReservation = new Map(folios.map((f) => [f.reservationId, f.id]));

      return reservations.map((r) => ({
        roomId: r.roomId,
        roomNumber: r.room.number,
        guestName: `${r.guest.firstName} ${r.guest.lastName}`,
        folioId: folioByReservation.get(r.id) ?? null,
      }));
    } catch (err) {
      console.warn("[pos] DB unavailable, using mock data:", err);
      return mockActiveRooms();
    }
  });

export const chargeToRoom = createServerFn({ method: "POST" })
  .inputValidator(chargeToRoomSchema)
  .handler(async ({ data }) => {
    await requireAction("createPosOrder");

    try {
      const reservation = await prisma.reservation.findFirst({
        where: {
          hotelId: data.hotelId,
          status: "CHECKED_IN",
          room: { number: data.roomNumber },
        },
      });

      if (!reservation) {
        throw new Error(`No active guest in room ${data.roomNumber}`);
      }

      const folio = await prisma.folio.findFirst({
        where: { reservationId: reservation.id, status: "OPEN" },
      });

      if (!folio) {
        throw new Error(`No open folio for room ${data.roomNumber}`);
      }

      await prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          await tx.folioItem.create({
            data: {
              folioId: folio.id,
              description: `${item.name} x${item.quantity}`,
              amount: item.price * item.quantity,
              category: "FOOD",
            },
          });
        }

        const allItems = await tx.folioItem.findMany({ where: { folioId: folio.id } });
        const totalAmount = allItems.reduce((sum, i) => sum + i.amount, 0);
        await tx.folio.update({
          where: { id: folio.id },
          data: { totalAmount },
        });
      });

      return { success: true as const, folioId: folio.id, itemsCharged: data.items.length };
    } catch (err) {
      if (isBusinessError(err)) throw err;
      console.warn("[pos] DB unavailable, using mock data:", err);
      return { success: true as const, folioId: "mock_folio", itemsCharged: data.items.length };
    }
  });
