import type {
  Folio,
  Guest,
  HousekeepingTask,
  HousekeepingTaskStatus,
  MaintenanceOrder,
  PosItem,
  Reservation,
  ReservationSource,
  ReservationStatus,
  Room,
  RoomStatus,
  StaffMember,
} from "@/lib/types";

const FIRST = ["Olivia", "Liam", "Emma", "Noah", "Sophia", "Mateo", "Aria", "Kai", "Zara", "Ethan", "Maya", "Leo"];
const LAST = ["Reyes", "Okafor", "Nakamura", "Bellini", "Hartwell", "Singh", "Dubois", "Costa", "Ivanov", "Chen", "Khan", "Bauer"];

export const ROOM_TYPE_NAMES = ["Deluxe Room", "Executive Suite", "Presidential Suite", "Garden Room"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

const today = new Date();
function dateOffset(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MOCK_ROOMS: Room[] = Array.from({ length: 12 }, (_, i) => {
  const statuses: RoomStatus[] = [
    "AVAILABLE",
    "OCCUPIED",
    "CLEANING",
    "INSPECTING",
    "MAINTENANCE",
    "AVAILABLE",
    "OCCUPIED",
    "OCCUPIED",
    "AVAILABLE",
    "CLEANING",
    "AVAILABLE",
    "OUT_OF_ORDER",
  ];
  const typeIdx = i % 3;
  return {
    id: `room_${i + 1}`,
    number: `${Math.floor(i / 4) + 2}0${(i % 4) + 1}`,
    typeId: `rt_${["standard", "deluxe", "suite"][typeIdx]}`,
    typeName: ["Deluxe Room", "Executive Suite", "Presidential Suite"][typeIdx]!,
    floor: Math.floor(i / 4) + 2,
    status: statuses[i]!,
    pricePerNight: [420, 780, 2400][typeIdx]!,
    maxOccupancy: [2, 3, 6][typeIdx]!,
  };
});

const LOYALTY_TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;

export const MOCK_GUESTS: Guest[] = Array.from({ length: 25 }, (_, i) => ({
  id: `guest_${i + 1}`,
  firstName: pick(FIRST, i),
  lastName: pick(LAST, i + 3),
  email: `${pick(FIRST, i).toLowerCase()}.${pick(LAST, i + 3).toLowerCase()}@mail.com`,
  phone: `+1 555-01${String(i).padStart(2, "0")}`,
  nationality: pick(["USA", "UK", "FR", "JP", "BR", "DE", "PT"], i),
  idType: pick(["Passport", "Driver License", "National ID"], i),
  idNumber: `ID-${10000 + i}`,
  dateOfBirth: dateOffset(-(25 * 365 + i * 120)),
  preferences: {
    roomTemp: pick(["68°F", "70°F", "72°F"], i),
    pillow: pick(["Firm", "Soft", "Hypoallergenic"], i),
    newspaper: pick(["None", "WSJ", "NYT"], i),
  },
  totalStays: (i % 9) + 1,
  loyaltyPoints: (i * 137) % 5000,
  lastStay: dateOffset(-(i % 30 + 1)),
  loyaltyTier: LOYALTY_TIERS[Math.min(Math.floor(((i * 137) % 5000) / 1500), 3)]!,
  notes: i % 5 === 0 ? "VIP guest — prefers corner rooms." : undefined,
}));

const RES_STATUSES: ReservationStatus[] = [
  "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "PENDING", "CONFIRMED",
  "CHECKED_IN", "CANCELLED", "CONFIRMED", "CHECKED_OUT", "NO_SHOW",
];
const RES_SOURCES: ReservationSource[] = [
  "DIRECT", "BOOKING_COM", "AIRBNB", "EXPEDIA", "PHONE", "WALKIN",
];

export const MOCK_RESERVATIONS: Reservation[] = Array.from({ length: 40 }, (_, i) => {
  const guest = MOCK_GUESTS[i % MOCK_GUESTS.length]!;
  const room = MOCK_ROOMS[i % MOCK_ROOMS.length]!;
  const checkInOffset = (i % 14) - 5;
  const nights = (i % 5) + 1;
  return {
    id: `res_${i + 1}`,
    code: `BK-${String(2400 + i).padStart(5, "0")}`,
    guestId: guest.id,
    guestName: `${guest.firstName} ${guest.lastName}`,
    roomId: room.id,
    roomNumber: room.number,
    roomType: room.typeName,
    checkIn: dateOffset(checkInOffset),
    checkOut: dateOffset(checkInOffset + nights),
    nights,
    adults: (i % 3) + 1,
    children: i % 2,
    status: pick(RES_STATUSES, i),
    source: pick(RES_SOURCES, i),
    totalAmount: room.pricePerNight * nights,
    specialRequests: i % 4 === 0 ? "Late check-in" : undefined,
  };
});

export const OCCUPANCY_7D = [
  { day: "Mon", occupancy: 72 },
  { day: "Tue", occupancy: 78 },
  { day: "Wed", occupancy: 84 },
  { day: "Thu", occupancy: 88 },
  { day: "Fri", occupancy: 92 },
  { day: "Sat", occupancy: 96 },
  { day: "Sun", occupancy: 81 },
];

export const REVENUE_BY_TYPE = [
  { name: "Deluxe Room", value: 24800 },
  { name: "Executive Suite", value: 38400 },
  { name: "Presidential Suite", value: 19200 },
];

export const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  OCCUPIED: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  CLEANING: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  INSPECTING: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  MAINTENANCE: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  OUT_OF_ORDER: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
};

export const RES_STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  CONFIRMED: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  CHECKED_IN: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  CHECKED_OUT: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  NO_SHOW: "bg-orange-500/15 text-orange-700 border-orange-500/30",
};

const HK_STATUSES: HousekeepingTaskStatus[] = [
  "TO_CLEAN", "IN_PROGRESS", "INSPECTING", "DONE",
  "TO_CLEAN", "IN_PROGRESS", "TO_CLEAN", "DONE",
];
const HK_ASSIGNEES = [
  { name: "Maria Santos", initials: "MS" },
  { name: "James Chen", initials: "JC" },
  { name: "Aisha Patel", initials: "AP" },
  { name: "Tom Bradley", initials: "TB" },
];

export const MOCK_HOUSEKEEPING: HousekeepingTask[] = MOCK_ROOMS.slice(0, 8).map((room, i) => ({
  id: `hk_${i + 1}`,
  roomId: room.id,
  roomNumber: room.number,
  roomType: room.typeName,
  assignedTo: HK_ASSIGNEES[i % HK_ASSIGNEES.length]!.name,
  assignedInitials: HK_ASSIGNEES[i % HK_ASSIGNEES.length]!.initials,
  type: pick(["STANDARD", "DEEP_CLEAN", "TURNDOWN", "INSPECTION"] as const, i),
  status: HK_STATUSES[i]!,
  priority: pick(["LOW", "NORMAL", "HIGH", "URGENT"] as const, i),
  notes: i % 3 === 0 ? "Guest requested extra towels" : undefined,
}));

export const MOCK_FOLIOS: Folio[] = MOCK_RESERVATIONS.filter(
  (r) => r.status === "CHECKED_IN" || r.status === "CONFIRMED",
).slice(0, 6).map((r, i) => {
  const items = [
    { id: `fi_${i}_1`, description: `Room charge — ${r.nights} nights`, amount: r.totalAmount * 0.7, category: "ROOM" as const, createdAt: r.checkIn },
    { id: `fi_${i}_2`, description: "Restaurant — Dinner", amount: 86, category: "FOOD" as const, createdAt: dateOffset(-1) },
    { id: `fi_${i}_3`, description: "Minibar", amount: 24, category: "MINIBAR" as const, createdAt: dateOffset(-1) },
    { id: `fi_${i}_4`, description: "Spa — Massage 60min", amount: 145, category: "SPA" as const, createdAt: dateOffset(0) },
    { id: `fi_${i}_5`, description: "Laundry service", amount: 32, category: "LAUNDRY" as const, createdAt: dateOffset(0) },
    { id: `fi_${i}_6`, description: "Room service breakfast", amount: 48, category: "FOOD" as const, createdAt: dateOffset(0) },
  ];
  const totalAmount = items.reduce((s, it) => s + it.amount, 0);
  const paidAmount = i % 2 === 0 ? totalAmount * 0.5 : 0;
  return {
    id: `folio_${i + 1}`,
    reservationId: r.id,
    guestName: r.guestName,
    roomNumber: r.roomNumber,
    items,
    payments: paidAmount > 0
      ? [{ id: `pay_${i}`, amount: paidAmount, method: "Credit Card", reference: "TXN-8842", status: "COMPLETED" as const, createdAt: dateOffset(-1) }]
      : [],
    totalAmount,
    paidAmount,
    status: paidAmount >= totalAmount ? "CLOSED" : "OPEN",
  };
});

export const MOCK_STAFF: StaffMember[] = [
  { id: "staff_1", name: "Alex Morgan", email: "alex@grandpalace.com", role: "HOTEL_ADMIN", initials: "AM", active: true, department: "Management" },
  { id: "staff_2", name: "Maria Santos", email: "maria@grandpalace.com", role: "HOUSEKEEPING", initials: "MS", active: true, department: "Housekeeping" },
  { id: "staff_3", name: "James Chen", email: "james@grandpalace.com", role: "FRONT_DESK", initials: "JC", active: true, department: "Front Office" },
  { id: "staff_4", name: "Aisha Patel", email: "aisha@grandpalace.com", role: "HOUSEKEEPING", initials: "AP", active: true, department: "Housekeeping" },
  { id: "staff_5", name: "Tom Bradley", email: "tom@grandpalace.com", role: "MAINTENANCE", initials: "TB", active: true, department: "Engineering" },
  { id: "staff_6", name: "Sarah Kim", email: "sarah@grandpalace.com", role: "ACCOUNTANT", initials: "SK", active: true, department: "Finance" },
  { id: "staff_7", name: "David Ortiz", email: "david@grandpalace.com", role: "POS_STAFF", initials: "DO", active: true, department: "F&B" },
  { id: "staff_8", name: "Elena Rossi", email: "elena@grandpalace.com", role: "FRONT_DESK", initials: "ER", active: false, department: "Front Office" },
];

export const MOCK_MAINTENANCE: MaintenanceOrder[] = [
  { id: "mo_1", roomId: "room_5", roomNumber: "201", title: "AC not cooling", description: "Guest reports room temperature above 78°F.", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "Tom Bradley", reportedBy: "James Chen", estimatedCost: 250, createdAt: dateOffset(-2) },
  { id: "mo_2", roomId: "room_12", roomNumber: "304", title: "Leaking faucet", description: "Bathroom sink dripping continuously.", priority: "MEDIUM", status: "OPEN", reportedBy: "Maria Santos", estimatedCost: 80, createdAt: dateOffset(-1) },
  { id: "mo_3", title: "Lobby chandelier dim", description: "One section of lobby lighting flickering.", priority: "LOW", status: "OPEN", reportedBy: "Alex Morgan", estimatedCost: 400, createdAt: dateOffset(0) },
  { id: "mo_4", roomId: "room_6", roomNumber: "202", title: "TV remote replacement", description: "Remote unresponsive after battery swap.", priority: "LOW", status: "COMPLETED", assignedTo: "Tom Bradley", reportedBy: "James Chen", estimatedCost: 25, createdAt: dateOffset(-5) },
  { id: "mo_5", roomId: "room_9", roomNumber: "301", title: "Door lock malfunction", description: "Key card intermittently fails.", priority: "CRITICAL", status: "IN_PROGRESS", assignedTo: "Tom Bradley", reportedBy: "James Chen", estimatedCost: 350, createdAt: dateOffset(0) },
];

export const MOCK_POS_ITEMS: PosItem[] = [
  { id: "pos_1", name: "Espresso", category: "Beverages", price: 5 },
  { id: "pos_2", name: "Club Sandwich", category: "Food", price: 18 },
  { id: "pos_3", name: "Caesar Salad", category: "Food", price: 16 },
  { id: "pos_4", name: "House Wine (glass)", category: "Beverages", price: 14 },
  { id: "pos_5", name: "Chocolate Cake", category: "Desserts", price: 12 },
  { id: "pos_6", name: "Mineral Water", category: "Beverages", price: 4 },
  { id: "pos_7", name: "Grilled Salmon", category: "Food", price: 32 },
  { id: "pos_8", name: "Mojito", category: "Beverages", price: 15 },
  { id: "pos_9", name: "Room Service Fee", category: "Fees", price: 8 },
  { id: "pos_10", name: "Cheese Board", category: "Food", price: 22 },
  { id: "pos_11", name: "Fresh Juice", category: "Beverages", price: 8 },
  { id: "pos_12", name: "Tiramisu", category: "Desserts", price: 11 },
];

export const REVENUE_OVER_TIME = [
  { date: "Mon", revenue: 18200 },
  { date: "Tue", revenue: 21400 },
  { date: "Wed", revenue: 19800 },
  { date: "Thu", revenue: 24100 },
  { date: "Fri", revenue: 28600 },
  { date: "Sat", revenue: 31200 },
  { date: "Sun", revenue: 22400 },
];

export const OCCUPANCY_BY_TYPE = [
  { type: "Deluxe Room", occupancy: 88 },
  { type: "Executive Suite", occupancy: 72 },
  { type: "Presidential Suite", occupancy: 45 },
  { type: "Garden Room", occupancy: 91 },
];

export const HK_STATUS_COLORS: Record<HousekeepingTaskStatus, string> = {
  TO_CLEAN: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  INSPECTING: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  DONE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceOrder["status"], string> = {
  OPEN: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
};

export const MAINTENANCE_PRIORITY_COLORS: Record<MaintenanceOrder["priority"], string> = {
  LOW: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30",
  MEDIUM: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  HIGH: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  CRITICAL: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};
