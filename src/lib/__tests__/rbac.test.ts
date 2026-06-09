import { test, expect } from "bun:test";
import { canDo } from "@/lib/rbac";
import type { StaffRole } from "@/lib/types";

const ALL_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "HOTEL_ADMIN",
  "FRONT_DESK",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
  "POS_STAFF",
];

type TestedAction =
  | "createReservation"
  | "recordPayment"
  | "inviteStaff"
  | "changeStaffRole"
  | "adjustLoyaltyPoints"
  | "voidFolioItem";

const PERMISSIONS: Record<TestedAction, { allowed: StaffRole[]; denied: StaffRole[] }> = {
  createReservation: {
    allowed: ["SUPER_ADMIN", "HOTEL_ADMIN", "FRONT_DESK"],
    denied: ["HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
  },
  recordPayment: {
    allowed: ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT", "FRONT_DESK"],
    denied: ["HOUSEKEEPING", "MAINTENANCE", "POS_STAFF"],
  },
  inviteStaff: {
    allowed: ["SUPER_ADMIN", "HOTEL_ADMIN"],
    denied: ["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
  },
  changeStaffRole: {
    allowed: ["SUPER_ADMIN"],
    denied: ["HOTEL_ADMIN", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
  },
  adjustLoyaltyPoints: {
    allowed: ["SUPER_ADMIN", "HOTEL_ADMIN"],
    denied: ["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT", "POS_STAFF"],
  },
  voidFolioItem: {
    allowed: ["SUPER_ADMIN", "HOTEL_ADMIN", "ACCOUNTANT"],
    denied: ["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "POS_STAFF"],
  },
};

for (const [action, { allowed, denied }] of Object.entries(PERMISSIONS) as [
  TestedAction,
  { allowed: StaffRole[]; denied: StaffRole[] },
][]) {
  test(`${action}: allowed roles`, () => {
    for (const role of allowed) {
      expect(canDo(role, action)).toBe(true);
    }
  });

  test(`${action}: denied roles`, () => {
    for (const role of denied) {
      expect(canDo(role, action)).toBe(false);
    }
  });
}

test("every role is classified for each permission", () => {
  for (const { allowed, denied } of Object.values(PERMISSIONS)) {
    expect([...allowed, ...denied].sort()).toEqual([...ALL_ROLES].sort());
  }
});
