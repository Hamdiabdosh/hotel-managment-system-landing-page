import type { LoyaltyTier } from "@/lib/types";

export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  Bronze: 0,
  Silver: 1500,
  Gold: 3500,
  Platinum: 7500,
};

export const POINTS_PER_NIGHT = 100;
export const POINTS_PER_CURRENCY_UNIT = 0.1;

export function getTier(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.Platinum) return "Platinum";
  if (points >= TIER_THRESHOLDS.Gold) return "Gold";
  if (points >= TIER_THRESHOLDS.Silver) return "Silver";
  return "Bronze";
}

export function pointsToNextTier(points: number): { tier: LoyaltyTier | null; pointsNeeded: number } {
  if (points >= TIER_THRESHOLDS.Platinum) return { tier: null, pointsNeeded: 0 };
  if (points >= TIER_THRESHOLDS.Gold) {
    return { tier: "Platinum", pointsNeeded: TIER_THRESHOLDS.Platinum - points };
  }
  if (points >= TIER_THRESHOLDS.Silver) {
    return { tier: "Gold", pointsNeeded: TIER_THRESHOLDS.Gold - points };
  }
  return { tier: "Silver", pointsNeeded: TIER_THRESHOLDS.Silver - points };
}

export function earnPointsForStay(nights: number, totalAmount: number): number {
  return Math.round(nights * POINTS_PER_NIGHT + totalAmount * POINTS_PER_CURRENCY_UNIT);
}
