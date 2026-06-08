import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
}

export function StatCard({ label, value, delta, trend = "up", icon: Icon }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--hotel-accent)", color: "var(--hotel-primary)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-serif text-3xl font-bold tracking-tight">{value}</div>
      {delta && (
        <div className={cn("mt-2 text-xs font-medium", trend === "up" ? "text-emerald-600" : "text-rose-600")}>
          {trend === "up" ? "▲" : "▼"} {delta} vs yesterday
        </div>
      )}
    </div>
  );
}
