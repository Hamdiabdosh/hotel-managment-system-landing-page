import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, DollarSign, Percent, TrendingUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { StatCard } from "@/components/dashboard/StatCard";
import { buildMockReportData as computeMockReportData, getReportData } from "@/lib/api/reports.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, toDateRangePreset } from "@/lib/format";
import { useHotelStore } from "@/store/hotelStore";
import type { DateRange, ReportData } from "@/lib/types";

export const Route = createFileRoute("/dashboard/reports")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/reports")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotelId = useHotelStore.getState().selectedHotel.id;
    const range = toDateRangePreset("month");
    try {
      return await getReportData({ data: { hotelId, ...range } });
    } catch (err) {
      console.warn("[reports] DB unavailable, using mock data:", err);
      return buildMockReportData(range);
    }
  },
  component: ReportsPage,
});

function buildMockReportData(range: DateRange): ReportData {
  return computeMockReportData(range);
}

function abbrevCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value}`;
}

function exportReportCsv(data: ReportData, preset: string) {
  const rows: (string | number)[][] = [
    ["Metric", "Value"],
    ["Occupancy %", data.kpis.occupancyPct],
    ["RevPAR", data.kpis.revPAR],
    ["ADR", data.kpis.adr],
    ["Total Revenue", data.kpis.totalRevenue],
    ["New Guests", data.kpis.newGuests],
    [],
    ["Date", "Revenue"],
    ...data.revenueOverTime.map((d) => [d.date, d.revenue]),
  ];

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${preset}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const [preset, setPreset] = useState<"today" | "week" | "month" | "year">("month");
  const [reportData, setReportData] = useState<ReportData>(Route.useLoaderData());
  const [loading, setLoading] = useState(false);
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const hotel = useHotelStore((s) => s.selectedHotel);

  useEffect(() => {
    setLoading(true);
    const range = toDateRangePreset(preset);
    getReportData({ data: { hotelId: hotel.id, ...range } })
      .then(setReportData)
      .catch(() => setReportData(buildMockReportData(range)))
      .finally(() => setLoading(false));
  }, [preset, hotel.id]);

  const sparseLabels = reportData.revenueOverTime.length > 14;
  const firstDate = reportData.revenueOverTime[0]?.date;
  const lastDate = reportData.revenueOverTime[reportData.revenueOverTime.length - 1]?.date;

  const dateTickFormatter = useMemo(
    () => (value: string) => {
      if (!sparseLabels) return value.slice(5);
      if (value === firstDate || value === lastDate) return value.slice(5);
      return "";
    },
    [sparseLabels, firstDate, lastDate],
  );

  return (
    <ModuleErrorBoundary module="Reports">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["today", "week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                  preset === p ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "week"
                    ? "This Week"
                    : p === "month"
                      ? "This Month"
                      : "This Year"}
              </button>
            ))}
          </div>
          {can("exportReports") && (
            <button
              onClick={() => exportReportCsv(reportData, preset)}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-background/50" />
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Occupancy"
              value={`${reportData.kpis.occupancyPct}%`}
              icon={Percent}
            />
            <StatCard
              label="RevPAR"
              value={formatCurrency(reportData.kpis.revPAR, hotel.currency)}
              icon={TrendingUp}
            />
            <StatCard
              label="ADR"
              value={formatCurrency(reportData.kpis.adr, hotel.currency)}
              icon={BarChart3}
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(reportData.kpis.totalRevenue, hotel.currency)}
              icon={DollarSign}
            />
            <StatCard
              label="New Guests"
              value={String(reportData.kpis.newGuests)}
              icon={Users}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Revenue Over Time</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.revenueOverTime}>
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickFormatter={dateTickFormatter}
                    interval={sparseLabels ? "preserveStartEnd" : 0}
                  />
                  <YAxis fontSize={12} tickFormatter={abbrevCurrency} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, hotel.currency)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--hotel-primary)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Occupancy Over Time</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.occupancyOverTime}>
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickFormatter={dateTickFormatter}
                    interval={sparseLabels ? "preserveStartEnd" : 0}
                  />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Area
                    type="monotone"
                    dataKey="occupancyPct"
                    stroke="var(--hotel-primary)"
                    fill="var(--hotel-primary)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Revenue by Source</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.revenueBySource}>
                  <XAxis dataKey="source" fontSize={11} />
                  <YAxis fontSize={12} tickFormatter={abbrevCurrency} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, hotel.currency)} />
                  <Bar
                    dataKey="revenue"
                    fill="var(--hotel-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Occupancy by Room Type</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.occupancyByType}>
                  <XAxis dataKey="type" fontSize={11} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar
                    dataKey="occupancyPct"
                    fill="var(--hotel-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-serif text-lg font-semibold">Top Guests by Spend</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Stays</th>
                  <th className="px-5 py-3">Total Spend</th>
                  <th className="px-5 py-3">Points</th>
                  <th className="px-5 py-3">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.topGuests.map((g) => (
                  <tr key={g.guestId} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to="/dashboard/guests/$id"
                        params={{ id: g.guestId }}
                        className="hover:underline"
                        style={{ color: "var(--hotel-primary)" }}
                      >
                        {g.guestName}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{g.totalStays}</td>
                    <td className="px-5 py-3">
                      {formatCurrency(g.totalSpend, hotel.currency)}
                    </td>
                    <td className="px-5 py-3">{g.loyaltyPoints.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          g.loyaltyTier === "Platinum"
                            ? "bg-violet-100 text-violet-700"
                            : g.loyaltyTier === "Gold"
                              ? "bg-yellow-100 text-yellow-700"
                              : g.loyaltyTier === "Silver"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {g.loyaltyTier}
                      </span>
                    </td>
                  </tr>
                ))}
                {reportData.topGuests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      No guest spend data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
