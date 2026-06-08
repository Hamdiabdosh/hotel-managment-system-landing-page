import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Percent, TrendingUp, Users, DollarSign, BarChart3 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { StatCard } from "@/components/dashboard/StatCard";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { OCCUPANCY_BY_TYPE, REVENUE_OVER_TIME } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsPage,
});

const PRESETS = ["Today", "This Week", "This Month", "Custom"] as const;

function ReportsPage() {
  const hotel = HOTEL_LIST[0]!;
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("This Week");

  return (
    <ModuleErrorBoundary module="Reports">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  preset === p ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Occupancy" value="86%" delta="4.2%" icon={Percent} />
          <StatCard label="RevPAR" value={formatCurrency(312, hotel.currency)} delta="6.1%" icon={TrendingUp} />
          <StatCard label="ADR" value={formatCurrency(428, hotel.currency)} delta="2.8%" icon={BarChart3} />
          <StatCard label="Total Revenue" value={formatCurrency(168400, hotel.currency)} delta="12%" icon={DollarSign} />
          <StatCard label="New Guests" value="38" delta="5" icon={Users} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Revenue Over Time</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={REVENUE_OVER_TIME}>
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, hotel.currency)} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--hotel-primary)" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Occupancy by Room Type</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={OCCUPANCY_BY_TYPE}>
                  <XAxis dataKey="type" fontSize={11} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="occupancy" fill="var(--hotel-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
