-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HOTEL_ADMIN', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT', 'POS_STAFF');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'INSPECTING', 'MAINTENANCE', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('DIRECT', 'BOOKING_COM', 'AIRBNB', 'EXPEDIA', 'PHONE', 'WALKIN');

-- CreateEnum
CREATE TYPE "FolioItemCategory" AS ENUM ('ROOM', 'FOOD', 'BEVERAGE', 'SPA', 'LAUNDRY', 'MINIBAR', 'OTHER');

-- CreateEnum
CREATE TYPE "FolioStatus" AS ENUM ('OPEN', 'CLOSED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "HousekeepingTaskType" AS ENUM ('STANDARD', 'DEEP_CLEAN', 'TURNDOWN', 'INSPECTION');

-- CreateEnum
CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('TO_CLEAN', 'IN_PROGRESS', 'INSPECTING', 'DONE');

-- CreateEnum
CREATE TYPE "HousekeepingPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerNight" DOUBLE PRECISION NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "amenities" TEXT[],
    "images" TEXT[],

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "status" "RoomStatus" NOT NULL,
    "pricePerNight" DOUBLE PRECISION NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "amenities" TEXT[],
    "images" TEXT[],

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "idType" TEXT,
    "idNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "preferences" JSONB,
    "totalStays" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "status" "ReservationStatus" NOT NULL,
    "source" "ReservationSource" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folio" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FolioStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioItem" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" "FolioItemCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "type" "HousekeepingTaskType" NOT NULL,
    "status" "HousekeepingTaskStatus" NOT NULL,
    "priority" "HousekeepingPriority" NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceOrder" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_hotelId_email_key" ON "User"("hotelId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hotelId_number_key" ON "Room"("hotelId", "number");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioItem" ADD CONSTRAINT "FolioItem_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
