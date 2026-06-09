import { test, expect } from "bun:test";
import { assertValidTransition } from "@/lib/api/reservations.queries";
import type { ReservationStatus } from "@/lib/types";

const VALID_TRANSITIONS: [ReservationStatus, ReservationStatus][] = [
  ["PENDING", "CONFIRMED"],
  ["CONFIRMED", "CHECKED_IN"],
  ["CHECKED_IN", "CHECKED_OUT"],
  ["CONFIRMED", "CANCELLED"],
  ["CONFIRMED", "NO_SHOW"],
  ["CANCELLED", "CONFIRMED"],
];

for (const [from, to] of VALID_TRANSITIONS) {
  test(`allows ${from} → ${to}`, () => {
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });
}

const INVALID_TRANSITIONS: [ReservationStatus, ReservationStatus][] = [
  ["CHECKED_OUT", "CHECKED_IN"],
  ["CHECKED_OUT", "PENDING"],
];

for (const [from, to] of INVALID_TRANSITIONS) {
  test(`rejects ${from} → ${to}`, () => {
    expect(() => assertValidTransition(from, to)).toThrow(
      `Invalid status transition: ${from} → ${to}`,
    );
  });
}

test("rejects PENDING → CANCELLED (not a valid source for cancellation)", () => {
  expect(() => assertValidTransition("PENDING", "CANCELLED")).toThrow(
    "Invalid status transition: PENDING → CANCELLED",
  );
});

test("rejects PENDING → NO_SHOW", () => {
  expect(() => assertValidTransition("PENDING", "NO_SHOW")).toThrow(
    "Invalid status transition: PENDING → NO_SHOW",
  );
});
