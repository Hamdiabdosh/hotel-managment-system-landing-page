export interface HotelTheme {
  primaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: "sharp" | "soft" | "round";
}

export interface RoomTypeConfig {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  maxOccupancy: number;
  amenities: string[];
  image: string;
}

export interface HotelConfig {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  logo: string;
  coverImage: string;
  gallery: string[];
  theme: HotelTheme;
  currency: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  amenities: { icon: string; label: string }[];
  roomTypes: RoomTypeConfig[];
  testimonials: { name: string; quote: string; rating: number }[];
  offers: { title: string; description: string; image: string; badge: string }[];
  features: {
    pos: boolean;
    channelManager: boolean;
    loyaltyProgram: boolean;
    multiProperty: boolean;
    maintenanceModule: boolean;
  };
}

export type RoomStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "CLEANING"
  | "INSPECTING"
  | "MAINTENANCE"
  | "OUT_OF_ORDER";

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type ReservationSource =
  | "DIRECT"
  | "BOOKING_COM"
  | "AIRBNB"
  | "EXPEDIA"
  | "PHONE"
  | "WALKIN";

export interface Room {
  id: string;
  number: string;
  typeId: string;
  typeName: string;
  floor: number;
  status: RoomStatus;
  pricePerNight: number;
  maxOccupancy: number;
}

export type StaffRole =
  | "SUPER_ADMIN"
  | "HOTEL_ADMIN"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "ACCOUNTANT"
  | "POS_STAFF";

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  idType?: string;
  idNumber?: string;
  dateOfBirth?: string;
  preferences?: Record<string, string>;
  totalStays: number;
  loyaltyPoints: number;
  lastStay?: string;
  loyaltyTier?: string;
  notes?: string;
}

export type HousekeepingTaskStatus = "TO_CLEAN" | "IN_PROGRESS" | "INSPECTING" | "DONE";
export type HousekeepingPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type HousekeepingTaskType = "STANDARD" | "DEEP_CLEAN" | "TURNDOWN" | "INSPECTION";

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  assignedTo: string;
  assignedInitials: string;
  type: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: HousekeepingPriority;
  notes?: string;
}

export type FolioItemCategory =
  | "ROOM"
  | "FOOD"
  | "BEVERAGE"
  | "SPA"
  | "LAUNDRY"
  | "MINIBAR"
  | "OTHER";

export type FolioStatus = "OPEN" | "CLOSED" | "VOID";

export interface FolioItem {
  id: string;
  description: string;
  amount: number;
  category: FolioItemCategory;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  createdAt: string;
}

export interface Folio {
  id: string;
  reservationId: string;
  guestName: string;
  roomNumber: string;
  items: FolioItem[];
  payments: Payment[];
  totalAmount: number;
  paidAmount: number;
  status: FolioStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  initials: string;
  active: boolean;
  department: string;
}

export interface StaffMemberDetail extends StaffMember {
  createdAt: string;
  shiftsThisWeek: number;
}

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface MaintenanceOrder {
  id: string;
  roomId?: string;
  roomNumber?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo?: string;
  reportedBy: string;
  estimatedCost?: number;
  createdAt: string;
}

export interface PosItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
}

export interface PosOrderItem {
  posItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Reservation {
  id: string;
  code: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  source: ReservationSource;
  totalAmount: number;
  specialRequests?: string;
}

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LoyaltyLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  balanceAfter: number;
}

export interface GuestStaySummary {
  reservationId: string;
  code: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  status: ReservationStatus;
}

export interface GuestDetail extends Guest {
  stays: GuestStaySummary[];
  loyaltyTier: LoyaltyTier;
  ledger: LoyaltyLedgerEntry[];
}

export interface CreateGuestInput {
  hotelId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  idType?: string;
  idNumber?: string;
  dateOfBirth?: string;
  preferences?: Record<string, string>;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportKpis {
  occupancyPct: number;
  revPAR: number;
  adr: number;
  totalRevenue: number;
  newGuests: number;
  totalRooms: number;
}

export interface OccupancyDataPoint {
  date: string;
  occupancyPct: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface RevenueBySourceDataPoint {
  source: string;
  revenue: number;
  bookings: number;
}

export interface OccupancyByTypeDataPoint {
  type: string;
  occupancyPct: number;
  totalRooms: number;
}

export interface TopGuestRow {
  guestId: string;
  guestName: string;
  totalStays: number;
  totalSpend: number;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
}

export interface ReportData {
  kpis: ReportKpis;
  occupancyOverTime: OccupancyDataPoint[];
  revenueOverTime: RevenueDataPoint[];
  revenueBySource: RevenueBySourceDataPoint[];
  occupancyByType: OccupancyByTypeDataPoint[];
  topGuests: TopGuestRow[];
}
