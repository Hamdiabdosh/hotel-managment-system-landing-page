import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { GuestProfileCard } from "@/components/guests/GuestProfileCard";
import {
  adjustLoyaltyPoints,
  getGuestDetail,
  updateGuestPreferences,
} from "@/lib/api/guests.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { MOCK_GUESTS, MOCK_RESERVATIONS, RES_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTier, pointsToNextTier, TIER_THRESHOLDS } from "@/lib/loyalty";
import { useHotelStore } from "@/store/hotelStore";
import type { GuestStaySummary, LoyaltyTier } from "@/lib/types";

const TIER_BADGE_CLASSES: Record<LoyaltyTier, string> = {
  Bronze: "border-amber-200 bg-amber-50 text-amber-700",
  Silver: "border-slate-200 bg-slate-50 text-slate-400",
  Gold: "border-yellow-200 bg-yellow-50 text-yellow-500",
  Platinum: "border-violet-200 bg-violet-50 text-violet-500",
};

export const Route = createFileRoute("/dashboard/guests/$id")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/guests")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async ({ params }) => {
    try {
      return await getGuestDetail({ data: { id: params.id } });
    } catch (err) {
      console.warn("[guest-detail] DB unavailable, using mock data:", err);
      const g = MOCK_GUESTS.find((guest) => guest.id === params.id);
      if (!g) throw notFound();
      const stays = MOCK_RESERVATIONS.filter((r) => r.guestId === g.id).map(
        (r): GuestStaySummary => ({
          reservationId: r.id,
          code: r.code,
          roomNumber: r.roomNumber,
          roomType: r.roomType,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          nights: r.nights,
          totalAmount: r.totalAmount,
          status: r.status,
        }),
      );
      return {
        ...g,
        stays,
        loyaltyTier: getTier(g.loyaltyPoints),
        ledger: [],
      };
    }
  },
  component: GuestDetailPage,
});

function GuestDetailPage() {
  const guest = Route.useLoaderData();
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const router = useRouter();

  const [loyaltyPoints, setLoyaltyPoints] = useState(guest.loyaltyPoints);
  const [loyaltyTier, setLoyaltyTier] = useState(guest.loyaltyTier);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [preferences, setPreferences] = useState<Record<string, string>>(
    guest.preferences ?? {},
  );
  const [prefNotes, setPrefNotes] = useState(guest.notes ?? "");
  const [prefEditing, setPrefEditing] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);

  const nextTier = useMemo(() => pointsToNextTier(loyaltyPoints), [loyaltyPoints]);
  const progressPct = useMemo(() => {
    if (!nextTier.tier) return 100;
    const currentThreshold =
      loyaltyTier === "Bronze"
        ? TIER_THRESHOLDS.Bronze
        : loyaltyTier === "Silver"
          ? TIER_THRESHOLDS.Silver
          : loyaltyTier === "Gold"
            ? TIER_THRESHOLDS.Gold
            : TIER_THRESHOLDS.Platinum;
    const nextThreshold = TIER_THRESHOLDS[nextTier.tier];
    const span = nextThreshold - currentThreshold;
    const progress = loyaltyPoints - currentThreshold;
    return Math.min(100, Math.round((progress / span) * 100));
  }, [loyaltyPoints, loyaltyTier, nextTier.tier]);

  const prefEntries = Object.entries(preferences);

  const handleAdjustPoints = async () => {
    const delta = Number.parseInt(adjustDelta, 10);
    if (Number.isNaN(delta) || delta === 0 || !adjustReason.trim()) return;

    setAdjustSubmitting(true);
    try {
      const result = await adjustLoyaltyPoints({
        data: {
          id: guest.id,
          hotelId: hotel.id,
          delta,
          reason: adjustReason.trim(),
        },
      });
      setLoyaltyPoints(result.newPoints);
      setLoyaltyTier(result.newTier);
      setAdjustOpen(false);
      setAdjustDelta("");
      setAdjustReason("");
      toast.success("Loyalty points updated");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust points");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      const updated = await updateGuestPreferences({
        data: {
          id: guest.id,
          preferences,
          notes: prefNotes || undefined,
        },
      });
      setPreferences(updated.preferences ?? {});
      setPrefNotes(updated.notes ?? "");
      setPrefEditing(false);
      toast.success("Preferences saved");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setPrefSaving(false);
    }
  };

  const updatePrefValue = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const removePrefKey = (key: string) => {
    setPreferences((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addPrefKey = () => {
    const key = `preference${prefEntries.length + 1}`;
    setPreferences((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <ModuleErrorBoundary module="Guest Profile">
      <div className="space-y-6">
        <Link
          to="/dashboard/guests"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to guests
        </Link>

        <GuestProfileCard
          guest={{ ...guest, loyaltyPoints, loyaltyTier }}
          stayHistory={[]}
          currency={hotel.currency}
          showPreferences={false}
          showStayHistory={false}
          tierClassName={TIER_BADGE_CLASSES[loyaltyTier]}
        />

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h3 className="font-serif text-lg font-semibold">Stay History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Booking Code</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Check-in</th>
                  <th className="px-4 py-3">Check-out</th>
                  <th className="px-4 py-3">Nights</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {guest.stays.map((stay) => (
                  <tr key={stay.reservationId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{stay.code}</td>
                    <td className="px-4 py-3">
                      {stay.roomNumber} · {stay.roomType}
                    </td>
                    <td className="px-4 py-3">{formatDate(stay.checkIn)}</td>
                    <td className="px-4 py-3">{formatDate(stay.checkOut)}</td>
                    <td className="px-4 py-3">{stay.nights}</td>
                    <td className="px-4 py-3">{formatCurrency(stay.totalAmount, hotel.currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RES_STATUS_COLORS[stay.status]}`}
                      >
                        {stay.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {guest.stays.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No stay history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-lg font-semibold">Loyalty Points</h3>
              <p className="mt-1 text-4xl font-bold tabular-nums">{loyaltyPoints.toLocaleString()}</p>
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_BADGE_CLASSES[loyaltyTier]}`}
              >
                {loyaltyTier}
              </span>
            </div>
            {can("adjustLoyaltyPoints") && (
              <button
                onClick={() => setAdjustOpen((v) => !v)}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Adjust Points
              </button>
            )}
          </div>

          <div className="mt-6">
            {nextTier.tier ? (
              <>
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {nextTier.tier}</span>
                  <span>{nextTier.pointsNeeded.toLocaleString()} pts needed</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPct}%`, backgroundColor: "var(--hotel-primary)" }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Maximum tier reached — Platinum member.</p>
            )}
          </div>

          {adjustOpen && can("adjustLoyaltyPoints") && (
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Delta (+/-)</label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="mt-1 w-32 rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAdjustPoints}
                disabled={adjustSubmitting}
                className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
              >
                {adjustSubmitting ? "Saving…" : "Submit"}
              </button>
            </div>
          )}

          {guest.ledger.length > 0 && (
            <ul className="mt-6 divide-y rounded-xl border text-sm">
              {guest.ledger.slice(0, 10).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{entry.reason}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(entry.createdAt.slice(0, 10))}</div>
                  </div>
                  <div className="text-right">
                    <div className={entry.delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {entry.delta >= 0 ? "+" : ""}
                      {entry.delta}
                    </div>
                    {entry.balanceAfter > 0 && (
                      <div className="text-xs text-muted-foreground">Balance: {entry.balanceAfter}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold">Preferences</h3>
            {!prefEditing ? (
              can("editGuestPreferences") ? (
                <button
                  onClick={() => setPrefEditing(true)}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Edit Preferences
                </button>
              ) : null
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreferences}
                  disabled={prefSaving}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
                >
                  {prefSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setPrefEditing(false);
                    setPreferences(guest.preferences ?? {});
                    setPrefNotes(guest.notes ?? "");
                  }}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!prefEditing && prefEntries.length === 0 && !prefNotes && (
            <p className="mt-4 text-sm text-muted-foreground">No preferences recorded.</p>
          )}

          {!prefEditing && prefEntries.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {prefEntries.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs capitalize text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {!prefEditing && prefNotes && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Notes:</strong> {prefNotes}
            </p>
          )}

          {prefEditing && (
            <div className="mt-4 space-y-3">
              {prefEntries.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <input
                    value={k}
                    readOnly
                    className="w-1/3 rounded-md border bg-muted px-3 py-2 text-sm"
                  />
                  <input
                    value={v}
                    onChange={(e) => updatePrefValue(k, e.target.value)}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removePrefKey(k)}
                    className="rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPrefKey}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--hotel-primary)" }}
              >
                + Add preference
              </button>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Staff notes</label>
                <textarea
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
