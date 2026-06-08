import type { DateRange } from "@/lib/types";

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export function toDateRangePreset(preset: "today" | "week" | "month" | "year"): DateRange {
  const to = new Date();
  const from = new Date();

  if (preset === "today") {
    // from and to are both today
  } else if (preset === "week") {
    from.setDate(from.getDate() - 6);
  } else if (preset === "month") {
    from.setDate(from.getDate() - 29);
  } else if (preset === "year") {
    from.setFullYear(from.getFullYear() - 1);
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function eachDayInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}
