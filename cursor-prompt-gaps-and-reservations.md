# Cursor Prompt — Fix 4 Foundation Gaps + Reservations Deep Dive

> Paste this entire prompt into Cursor's composer (Cmd+I / Ctrl+I) with the
> project open. Work through Part 1 first, then Part 2 in the same session.
> Do not jump to Part 2 before Part 1 is complete.

---

## Context

This is a multi-tenant Hotel Management System built with:
- **TanStack Start** (file-based routing under `src/routes/`)
- **TanStack Router** with `createFileRoute`, `loader`, `notFound()`
- **Zustand** for dashboard hotel state (`src/store/hotelStore.ts`)
- **React Hook Form + Zod** for forms
- **Recharts** for charts
- **Tailwind CSS** — hotel theme is injected as CSS vars: `--hotel-primary`, `--hotel-accent`
- **Prisma** schema already exists at `prisma/schema.prisma` (PostgreSQL, no DB connected yet)
- Server functions use `createServerFn` from `@tanstack/react-start` (see `src/lib/api/example.functions.ts` for the exact pattern)
- All mock data lives in `src/lib/mock-data.ts`; all types in `src/lib/types.ts`

---

## Part 1 — Fix 4 Foundation Gaps

Fix each of these in order. Make the minimal change that fixes the problem —
do not refactor surrounding code unless the fix requires it.

---

### Fix 1 — Derive dashboard stats from real mock data

**File:** `src/routes/dashboard.index.tsx`

**Problem:** The 4 `StatCard` values are hardcoded strings (`"86%"`, `"14"`, `"9"`, `"$24,820"`). They must be derived from `MOCK_RESERVATIONS` and `MOCK_ROOMS` so they reflect actual data.

**Fix:** At the top of `DashboardHome`, compute these values:

```ts
// today as YYYY-MM-DD (same format as mock data)
const todayStr = new Date().toISOString().slice(0, 10);

// occupancy = OCCUPIED rooms / total rooms * 100
const occupiedCount = MOCK_ROOMS.filter(r => r.status === "OCCUPIED").length;
const occupancyPct = Math.round((occupiedCount / MOCK_ROOMS.length) * 100);

// arrivals today = CONFIRMED or PENDING reservations with checkIn === today
const arrivalsToday = MOCK_RESERVATIONS.filter(
  r => (r.status === "CONFIRMED" || r.status === "PENDING") && r.checkIn === todayStr
).length;

// departures today = CHECKED_IN reservations with checkOut === today
const departuresToday = MOCK_RESERVATIONS.filter(
  r => r.status === "CHECKED_IN" && r.checkOut === todayStr
).length;

// revenue today = sum of CHECKED_IN reservations with checkIn === today
const revenueToday = MOCK_RESERVATIONS
  .filter(r => r.status === "CHECKED_IN" && r.checkIn === todayStr)
  .reduce((sum, r) => sum + r.totalAmount, 0);
```

Pass these into the StatCards. Remove the hardcoded strings entirely.

---

### Fix 2 — Chart colors from CSS variables, not hardcoded hex

**File:** `src/routes/dashboard.index.tsx`

**Problem:** The `PIE_COLORS` constant is `["#1B4332", "#D4AF37", "#9C4221"]` — hardcoded hex values from the Grand Palace theme. When the user switches to Sunset Inn the pie chart stays green + gold.

**Fix:** Remove the `PIE_COLORS` constant. Replace `<Cell fill={PIE_COLORS[i % PIE_COLORS.length]} />` with:

```tsx
<Cell
  key={i}
  fill={i === 0 ? "var(--hotel-primary)" : i === 1 ? "var(--hotel-accent)" : "hsl(var(--muted-foreground))"}
/>
```

Also update the `<Line>` in the occupancy chart — it already uses `var(--hotel-primary)` correctly, no change needed there.

---

### Fix 3 — Remove try/catch anti-pattern from useHotelConfig

**File:** `src/hooks/useHotelConfig.ts`

**Problem:** The hook wraps `useParams` in a try/catch to detect whether it's inside a `/$hotel/` route or a `/dashboard/` route. This silently swallows real routing errors and violates the Rules of Hooks (conditional hook invocation pattern is fragile).

**Fix:** Delete the entire `useHotelConfig.ts` file. Then update its two usage sites:

**Usage site 1 — `src/components/dashboard/DashboardSidebar.tsx`:**
Replace `useHotelConfig()` with `useHotelStore((s) => s.selectedHotel)`. Import `useHotelStore` from `@/store/hotelStore`.

**Usage site 2 — anywhere else `useHotelConfig` is imported:**
Run a project-wide search for `useHotelConfig`. For any dashboard component using it, replace with `useHotelStore((s) => s.selectedHotel)`. The landing page already uses the loader directly (`Route.useLoaderData()`) — do not touch those files.

---

### Fix 4 — Front Desk date filter

**File:** `src/routes/dashboard.front-desk.tsx`

**Problem:** Arrivals shows all CONFIRMED/PENDING reservations regardless of date. Departures shows all CHECKED_IN regardless of date. On day 2 of using the system these lists will be enormous.

**Fix:** Add today's date filter:

```ts
const todayStr = new Date().toISOString().slice(0, 10);

const arrivals = MOCK_RESERVATIONS.filter(
  r => (r.status === "CONFIRMED" || r.status === "PENDING") && r.checkIn === todayStr
);

const departures = MOCK_RESERVATIONS.filter(
  r => r.status === "CHECKED_IN" && r.checkOut === todayStr
);
```

Because the mock data uses relative `dateOffset()` values, some reservations will land on today. If the lists are empty during testing that is correct behavior — it means no mock reservations happen to fall on today's exact date. Do not add `.slice(0, 6)` back.

Update the subtitle counts on both columns to use `arrivals.length` and `departures.length` respectively.

---

## Part 2 — Reservations Module: Real API Layer

Now that the foundation is clean, build the complete server-side API layer for the Reservations module. The UI already exists and works with mock data. The goal is to wire it to real Prisma queries using TanStack Start server functions, keeping the existing UI components completely unchanged.

The database is not connected yet (`DATABASE_URL` is not set). All server functions must handle this gracefully — if the DB is unavailable they must fall back to mock data and log a warning, never crash. This lets the UI keep working during development before the DB is provisioned.

---

### Step 1 — Create the reservations server functions file

**Create:** `src/lib/api/reservations.functions.ts`

This file contains all server functions for the Reservations module. Follow the exact pattern from `src/lib/api/example.functions.ts`.

Build these 5 server functions:

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
// import { prisma } from "@/lib/prisma"; // uncomment when DB is connected
import {
  MOCK_RESERVATIONS,
  MOCK_GUESTS,
  MOCK_ROOMS,
} from "@/lib/mock-data";
import type { Reservation } from "@/lib/types";
```

**Function 1: `listReservations`**
- Method: `GET`
- Input schema: `{ hotelId: string, status?: ReservationStatus, source?: ReservationSource, roomType?: string, dateFrom?: string, dateTo?: string, query?: string, page?: number, pageSize?: number }`
- Handler: query `Reservation` table with `where: { hotelId }` + optional filters. Include `guest` and `room` relations. Return `{ reservations: Reservation[], total: number, page: number, pageSize: number }`.
- Fallback: if DB unavailable, filter `MOCK_RESERVATIONS` using the same logic from `useReservations.ts` hook and return with `total: MOCK_RESERVATIONS.length`.

**Function 2: `getReservation`**
- Method: `GET`
- Input schema: `{ id: string }`
- Handler: `prisma.reservation.findUniqueOrThrow({ where: { id }, include: { guest: true, room: true, folios: { include: { items: true, payments: true } } } })`
- Fallback: find in `MOCK_RESERVATIONS` and attach mock guest/folio from mock data.

**Function 3: `createReservation`**
- Method: `POST`
- Input schema (Zod):
  ```ts
  z.object({
    hotelId: z.string(),
    guestId: z.string(),
    roomId: z.string(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10).default(0),
    source: z.enum(["DIRECT","BOOKING_COM","AIRBNB","EXPEDIA","PHONE","WALKIN"]),
    specialRequests: z.string().optional(),
    depositAmount: z.number().min(0).default(0),
  })
  ```
- Handler:
  1. Validate `checkOut > checkIn` — throw `new Error("Check-out must be after check-in")` if not.
  2. Check room availability: query for any CONFIRMED or CHECKED_IN reservation on the same room where date ranges overlap.
  3. Compute `nights` and `totalAmount` from the room's `pricePerNight`.
  4. Create the reservation with `status: "CONFIRMED"`.
  5. Create an initial `Folio` with one `FolioItem` of category `ROOM` for the room charge.
  6. Return the created reservation.
- Fallback: return a mock reservation object with a generated id.

**Function 4: `updateReservationStatus`**
- Method: `POST`
- Input schema: `{ id: string, status: ReservationStatus, notes?: string }`
- Valid transitions (enforce server-side):
  - `PENDING → CONFIRMED`
  - `CONFIRMED → CHECKED_IN | CANCELLED`
  - `CHECKED_IN → CHECKED_OUT`
  - `CONFIRMED → NO_SHOW`
- Throw if the transition is not in this list.
- Handler: `prisma.reservation.update({ where: { id }, data: { status } })`
- Also write an `AuditLog` entry: `{ action: "STATUS_CHANGE", entity: "Reservation", entityId: id, before: { status: currentStatus }, after: { status: newStatus } }`
- Fallback: return a mock updated reservation.

**Function 5: `cancelReservation`**
- Method: `POST`
- Input schema: `{ id: string, reason?: string }`
- Handler: update status to `CANCELLED`, log audit entry.
- Fallback: return mock.

---

### Step 2 — Create the Prisma client singleton

**Create:** `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This is the standard singleton pattern for Prisma in Node.js — prevents connection pool exhaustion during hot reloads.

---

### Step 3 — Wire listReservations into the Reservations route

**File:** `src/routes/dashboard.reservations.tsx`

The existing `useReservations` hook reads from `MOCK_RESERVATIONS` directly. Add a parallel data-loading path using the server function, keeping the mock fallback.

Add a `loader` to the route:

```ts
export const Route = createFileRoute("/dashboard/reservations")({
  loader: async () => {
    try {
      const result = await listReservations({
        data: { hotelId: "h_grand_palace", page: 0, pageSize: 200 },
      });
      return { reservations: result.reservations };
    } catch {
      return { reservations: MOCK_RESERVATIONS };
    }
  },
  component: ReservationsPage,
});
```

In `ReservationsPage`, read from the loader first, fall back to mock:

```ts
const loaderData = Route.useLoaderData();
// pass loaderData.reservations to useReservations instead of MOCK_RESERVATIONS
```

Update `useReservations` to accept an optional `data` parameter:

```ts
export function useReservations(
  data?: Reservation[],
  initial?: Partial<ReservationFilters>
) {
  const source = data ?? MOCK_RESERVATIONS;
  // rest of the hook unchanged, but filter `source` instead of MOCK_RESERVATIONS
}
```

---

### Step 4 — Wire createReservation into the ReservationForm

**File:** `src/components/reservations/ReservationForm.tsx`

Find the `onSubmit` handler. Currently it calls the prop callback immediately (mock). Replace with:

```ts
const handleSubmit = async (data: FormData) => {
  try {
    await createReservation({ data: { ...data, hotelId: hotel.id } });
    onSubmit();
  } catch (err) {
    // show error in the form
    setError("root", { message: err instanceof Error ? err.message : "Failed to create reservation" });
  }
};
```

Add `isSubmitting` state to disable the submit button during the call. Display `errors.root?.message` in a red paragraph above the submit button.

---

### Step 5 — Wire updateReservationStatus into the detail page

**File:** `src/routes/dashboard.reservations.$id.tsx`

Add status transition buttons below the booking details card. Show only the valid next statuses based on the current status:

```ts
const TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  PENDING:     ["CONFIRMED"],
  CONFIRMED:   ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN:  ["CHECKED_OUT"],
};

const nextStatuses = TRANSITIONS[reservation.status] ?? [];
```

Render a button for each `nextStatuses` entry. On click, call `updateReservationStatus` and reload the route (`router.invalidate()`).

Fix the hardcoded `const hotel = HOTEL_LIST[0]!` — replace with `useHotelStore((s) => s.selectedHotel)`.

---

### Step 6 — Add a `reservations.queries.ts` helper (Cursor-only, no UI)

**Create:** `src/lib/api/reservations.queries.ts`

These are plain async functions (not server functions) that the server functions call internally. They encapsulate the Prisma queries so they're easy to test and reuse.

```ts
import { prisma } from "@/lib/prisma";
import type { ReservationStatus } from "@/lib/types";

// Check if a room is available for a given date range
export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      roomId,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      AND: [
        { checkIn: { lt: checkOut } },
        { checkOut: { gt: checkIn } },
      ],
    },
  });
  return conflict === null;
}

// Get today's arrivals for a hotel
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

// Get today's departures for a hotel
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

// Compute KPIs for the dashboard stat cards
export async function getDashboardKpis(hotelId: string) {
  const [totalRooms, occupiedRooms, todayArrivals, todayDepartures] =
    await Promise.all([
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
```

---

## Code Quality Rules

Follow these for all code written in this session:

- No `any` — use `unknown` and type-narrow, or the proper type from `src/lib/types.ts`
- All Prisma calls inside server functions are wrapped in try/catch with mock fallback
- Zod schemas are defined once at the top of the file, not inline in the function call
- Date comparisons use ISO string comparison for mock data (`"2026-06-08" < "2026-06-09"` is valid) and `Date` objects for Prisma queries
- Server functions are named exports, not default exports
- `createServerFn({ method: "GET" })` for reads, `createServerFn({ method: "POST" })` for writes
- No `console.log` — use `console.warn` for fallback notices: `console.warn("[reservations] DB unavailable, using mock data:", err)`

---

## What NOT to change in this session

- Do not modify any `src/components/ui/` files
- Do not modify `prisma/schema.prisma`
- Do not modify the landing page routes (`src/routes/$hotel.*.tsx`)
- Do not add real-time features, websockets, or subscriptions
- Do not implement email sending (the stub in `src/lib/email.ts` is correct as-is)
- Do not implement payment processing
