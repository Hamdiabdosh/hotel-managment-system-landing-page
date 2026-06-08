import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password.server";
import {
  MOCK_ROOMS,
  MOCK_GUESTS,
  MOCK_RESERVATIONS,
  MOCK_FOLIOS,
  MOCK_STAFF,
  MOCK_HOUSEKEEPING,
  MOCK_MAINTENANCE,
} from "../src/lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");
  const defaultPassword = await hashPassword("password123");

  const grandPalace = await prisma.hotel.upsert({
    where: { slug: "grand-palace" },
    update: {},
    create: {
      id: "h_grand_palace",
      slug: "grand-palace",
      name: "The Grand Palace",
      config: {},
    },
  });

  await prisma.hotel.upsert({
    where: { slug: "sunset-inn" },
    update: {},
    create: {
      id: "h_sunset_inn",
      slug: "sunset-inn",
      name: "Sunset Inn",
      config: {},
    },
  });

  for (const s of MOCK_STAFF) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        hotelId: grandPalace.id,
        email: s.email,
        hashedPassword: defaultPassword,
        role: s.role,
        name: s.name,
      },
    });
  }

  for (const r of MOCK_ROOMS) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        hotelId: grandPalace.id,
        number: r.number,
        type: r.typeName,
        floor: r.floor,
        status: r.status,
        pricePerNight: r.pricePerNight,
        maxOccupancy: r.maxOccupancy,
        amenities: [],
        images: [],
      },
    });
  }

  for (const g of MOCK_GUESTS) {
    await prisma.guest.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        hotelId: grandPalace.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
        nationality: g.nationality,
        idType: g.idType,
        idNumber: g.idNumber,
        totalStays: g.totalStays,
        loyaltyPoints: g.loyaltyPoints,
        preferences: g.preferences ?? {},
      },
    });
  }

  for (const r of MOCK_RESERVATIONS) {
    await prisma.reservation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        hotelId: grandPalace.id,
        guestId: r.guestId,
        roomId: r.roomId,
        checkIn: new Date(r.checkIn),
        checkOut: new Date(r.checkOut),
        adults: r.adults,
        children: r.children,
        status: r.status,
        source: r.source,
        totalAmount: r.totalAmount,
        depositAmount: 0,
        specialRequests: r.specialRequests,
      },
    });
  }

  for (const f of MOCK_FOLIOS) {
    const folio = await prisma.folio.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        reservationId: f.reservationId,
        totalAmount: f.totalAmount,
        paidAmount: f.paidAmount,
        status: f.status,
      },
    });

    for (const item of f.items) {
      await prisma.folioItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          id: item.id,
          folioId: folio.id,
          description: item.description,
          amount: item.amount,
          category: item.category,
          createdAt: new Date(item.createdAt),
        },
      });
    }

    for (const p of f.payments) {
      await prisma.payment.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          folioId: folio.id,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          status: p.status,
          createdAt: new Date(p.createdAt),
        },
      });
    }
  }

  for (const t of MOCK_HOUSEKEEPING) {
    const staff = MOCK_STAFF.find((s) => s.name === t.assignedTo);
    await prisma.housekeepingTask.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        hotelId: grandPalace.id,
        roomId: t.roomId,
        assignedToId: staff?.id ?? null,
        type: t.type,
        status: t.status,
        priority: t.priority,
        notes: t.notes,
      },
    });
  }

  for (const m of MOCK_MAINTENANCE) {
    const assignee = MOCK_STAFF.find((s) => s.name === m.assignedTo);
    const reporter = MOCK_STAFF.find((s) => s.name === m.reportedBy);
    if (!reporter) continue;
    await prisma.maintenanceOrder.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        hotelId: grandPalace.id,
        roomId: m.roomId ?? null,
        reportedById: reporter.id,
        assignedToId: assignee?.id ?? null,
        title: m.title,
        description: m.description,
        priority: m.priority,
        status: m.status,
        estimatedCost: m.estimatedCost,
        createdAt: new Date(m.createdAt),
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
