import type { StaffRole } from "@/lib/types";

// Route-level permission map — which roles can access which route segments
export const ROUTE_PERMISSIONS: Record<string, StaffRole[]> = {
  "/dashboard":                    ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
  "/dashboard/front-desk":         ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
  "/dashboard/reservations":       ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "ACCOUNTANT"],
  "/dashboard/rooms":              ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE"],
  "/dashboard/housekeeping":       ["SUPER_ADMIN", "HOTEL_ADMIN", "HOUSEKEEPING", "FRONT_DESK"],
  "/dashboard/maintenance":        ["SUPER_ADMIN", "HOTEL_ADMIN", "MAINTENANCE", "FRONT_DESK"],
  "/dashboard/guests":             ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "ACCOUNTANT"],
  "/dashboard/billing":            ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT", "FRONT_DESK"],
  "/dashboard/reports":            ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT"],
  "/dashboard/pos":                ["SUPER_ADMIN", "HOTEL_ADMIN", "POS_STAFF", "FRONT_DESK"],
  "/dashboard/staff":              ["SUPER_ADMIN", "HOTEL_ADMIN"],
  "/dashboard/settings":           ["SUPER_ADMIN", "HOTEL_ADMIN"],
  "/dashboard/channel-manager":    ["SUPER_ADMIN", "HOTEL_ADMIN"],
  "/dashboard/profile":            ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
};

// Action-level permissions — granular UI controls
export const ACTION_PERMISSIONS = {
  // Reservations
  createReservation:        ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],
  cancelReservation:        ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],
  updateReservationStatus:  ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],

  // Billing
  addFolioCharge:           ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT", "FRONT_DESK"] as StaffRole[],
  recordPayment:            ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT", "FRONT_DESK"] as StaffRole[],
  voidFolioItem:            ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT"] as StaffRole[],
  closeFolio:               ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT"] as StaffRole[],

  // Guests
  createGuest:              ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],
  editGuestPreferences:     ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],
  adjustLoyaltyPoints:      ["SUPER_ADMIN", "HOTEL_ADMIN"] as StaffRole[],

  // Rooms
  updateRoomStatus:         ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING"] as StaffRole[],
  createMaintenanceOrder:   ["SUPER_ADMIN", "HOTEL_ADMIN", "MAINTENANCE", "FRONT_DESK"] as StaffRole[],

  // Housekeeping
  advanceHousekeepingTask:  ["SUPER_ADMIN", "HOTEL_ADMIN", "HOUSEKEEPING"] as StaffRole[],
  assignHousekeepingTask:   ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"] as StaffRole[],

  // Staff
  inviteStaff:              ["SUPER_ADMIN", "HOTEL_ADMIN"] as StaffRole[],
  deactivateStaff:          ["SUPER_ADMIN", "HOTEL_ADMIN"] as StaffRole[],
  changeStaffRole:          ["SUPER_ADMIN"] as StaffRole[],

  // Settings
  editHotelSettings:        ["SUPER_ADMIN", "HOTEL_ADMIN"] as StaffRole[],
  editHotelTheme:           ["SUPER_ADMIN"] as StaffRole[],

  // Reports
  exportReports:            ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT"] as StaffRole[],

  // POS
  createPosOrder:           ["SUPER_ADMIN", "HOTEL_ADMIN", "POS_STAFF", "FRONT_DESK"] as StaffRole[],
} as const;

export type ActionKey = keyof typeof ACTION_PERMISSIONS;

export function canAccess(role: StaffRole, route: string): boolean {
  const allowed = ROUTE_PERMISSIONS[route];
  if (!allowed) return true; // unlisted routes are unrestricted
  return allowed.includes(role);
}

export function canDo(role: StaffRole, action: ActionKey): boolean {
  return ACTION_PERMISSIONS[action].includes(role);
}

// Server-side guard — throws if role not allowed
export function assertRole(role: StaffRole, action: ActionKey): void {
  if (!canDo(role, action)) {
    throw new Error(`Forbidden: role ${role} cannot perform ${action}`);
  }
}

// Human-readable role labels
export const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN:   "Super Admin",
  HOTEL_ADMIN:   "Hotel Admin",
  FRONT_DESK:    "Front Desk",
  HOUSEKEEPING:  "Housekeeping",
  MAINTENANCE:   "Maintenance",
  ACCOUNTANT:    "Accountant",
  POS_STAFF:     "POS Staff",
};

// Default redirect per role after login
export const ROLE_HOME: Record<StaffRole, string> = {
  SUPER_ADMIN:   "/dashboard",
  HOTEL_ADMIN:   "/dashboard",
  FRONT_DESK:    "/dashboard/front-desk",
  HOUSEKEEPING:  "/dashboard/housekeeping",
  MAINTENANCE:   "/dashboard/maintenance",
  ACCOUNTANT:    "/dashboard/billing",
  POS_STAFF:     "/dashboard/pos",
};

export const ROLE_DEPARTMENT: Record<StaffRole, string> = {
  SUPER_ADMIN:   "Administration",
  HOTEL_ADMIN:   "Administration",
  FRONT_DESK:    "Front Office",
  HOUSEKEEPING:  "Housekeeping",
  MAINTENANCE:   "Engineering",
  ACCOUNTANT:    "Finance",
  POS_STAFF:     "Food & Beverage",
};
