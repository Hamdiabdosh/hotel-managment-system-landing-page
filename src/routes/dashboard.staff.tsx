import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MoreHorizontal, Search, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCurrentSession } from "@/lib/api/auth.functions";
import {
  deactivateStaff,
  inviteStaff,
  listStaff,
  mapMockStaffMember,
  reactivateStaff,
  resetStaffPassword,
  updateStaffRole,
} from "@/lib/api/staff.functions";
import { canAccess, ROLE_DEPARTMENT, ROLE_LABELS } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { MOCK_STAFF } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";
import type { StaffMemberDetail, StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAFF_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "HOTEL_ADMIN",
  "FRONT_DESK",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
  "POS_STAFF",
];

const inviteSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  role: z.enum([
    "SUPER_ADMIN",
    "HOTEL_ADMIN",
    "FRONT_DESK",
    "HOUSEKEEPING",
    "MAINTENANCE",
    "ACCOUNTANT",
    "POS_STAFF",
  ]),
});

type InviteFormData = z.infer<typeof inviteSchema>;

const DEPT_COLORS: Record<string, string> = {
  Administration: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  "Front Office": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Housekeeping: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  Engineering: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  Finance: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  "Food & Beverage": "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export const Route = createFileRoute("/dashboard/staff")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/staff")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotelId = useHotelStore.getState().selectedHotel.id;
    try {
      const staff = await listStaff({ data: { hotelId, includeInactive: false } });
      return { staff };
    } catch (err) {
      console.warn("[staff] DB unavailable, using mock data:", err);
      return {
        staff: MOCK_STAFF.filter((m) => m.active).map(mapMockStaffMember),
      };
    }
  },
  component: StaffPage,
});

function StaffPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { staff: initialStaff } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMemberDetail[]>(initialStaff);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMemberDetail | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "FRONT_DESK" },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  useEffect(() => {
    if (!showInactive) return;

    setLoading(true);
    listStaff({ data: { hotelId: hotel.id, includeInactive: true } })
      .then(setStaff)
      .catch(() => {
        setStaff(MOCK_STAFF.map(mapMockStaffMember));
      })
      .finally(() => setLoading(false));
  }, [showInactive, hotel.id]);

  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (!showInactive && !m.active) return false;
      if (!debouncedQuery) return true;
      const q = debouncedQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [staff, roleFilter, showInactive, debouncedQuery]);

  const deptSummary = useMemo(() => {
    const depts = new Map<string, { count: number; roles: Set<string> }>();
    for (const m of filteredStaff.filter((s) => s.active)) {
      const entry = depts.get(m.department) ?? { count: 0, roles: new Set<string>() };
      entry.count += 1;
      entry.roles.add(ROLE_LABELS[m.role]);
      depts.set(m.department, entry);
    }
    return Array.from(depts.entries())
      .map(([name, { count, roles }]) => ({
        name,
        count,
        roles: Array.from(roles).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredStaff]);

  const showActions = can("changeStaffRole") || can("deactivateStaff") || can("inviteStaff");

  const handleInvite = async (formData: InviteFormData) => {
    try {
      await inviteStaff({
        data: {
          hotelId: hotel.id,
          ...formData,
        },
      });
      toast.success(`${formData.name} has been invited`);
      reset();
      setInviteOpen(false);
      router.invalidate();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to invite staff",
      });
    }
  };

  const handleRoleChange = async (memberId: string, role: StaffRole) => {
    try {
      await updateStaffRole({
        data: { id: memberId, hotelId: hotel.id, role },
      });
      toast.success("Role updated");
      setEditingRoleId(null);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleDeactivate = async (memberId: string) => {
    try {
      await deactivateStaff({ data: { id: memberId, hotelId: hotel.id } });
      toast.success("Staff member deactivated");
      setDeactivateTarget(null);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    }
  };

  const handleReactivate = async (memberId: string) => {
    try {
      await reactivateStaff({ data: { id: memberId, hotelId: hotel.id } });
      toast.success("Staff member reactivated");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate");
    }
  };

  const handleResetPassword = async (member: StaffMemberDetail) => {
    try {
      await resetStaffPassword({ data: { id: member.id, hotelId: hotel.id } });
      toast.success(`Password reset email sent to ${member.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    }
  };

  return (
    <ModuleErrorBoundary module="Staff">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name or email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as StaffRole | "ALL")}
            className="rounded-md border bg-card px-3 py-2 text-sm"
          >
            <option value="ALL">All roles</option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {can("deactivateStaff") && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border"
              />
              Show inactive
            </label>
          )}
          {can("inviteStaff") && (
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              <UserPlus className="h-4 w-4" /> Invite Staff
            </button>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 bg-background/50" />
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Shifts / Week</th>
                  <th className="px-4 py-3">Status</th>
                  {showActions && <th className="px-4 py-3 w-16">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className={cn("hover:bg-muted/30", !member.active && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: "var(--hotel-primary)",
                            color: "var(--hotel-accent)",
                          }}
                        >
                          {member.initials}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3">
                      {editingRoleId === member.id && can("changeStaffRole") ? (
                        <select
                          autoFocus
                          defaultValue={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value as StaffRole)
                          }
                          onBlur={() => setEditingRoleId(null)}
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                        >
                          {STAFF_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            DEPT_COLORS[member.department] ?? "",
                          )}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.department}</td>
                    <td className="px-4 py-3 tabular-nums">{member.shiftsThisWeek}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          member.active
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                            : "border-zinc-500/30 bg-zinc-500/15 text-zinc-600",
                        )}
                      >
                        {member.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can("changeStaffRole") && member.id !== session.user.id && (
                              <DropdownMenuItem onClick={() => setEditingRoleId(member.id)}>
                                Change Role
                              </DropdownMenuItem>
                            )}
                            {can("inviteStaff") && (
                              <DropdownMenuItem onClick={() => handleResetPassword(member)}>
                                Reset Password
                              </DropdownMenuItem>
                            )}
                            {can("deactivateStaff") && member.id !== session.user.id && (
                              member.active ? (
                                <DropdownMenuItem
                                  className="text-rose-600 focus:text-rose-600"
                                  onClick={() => setDeactivateTarget(member)}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleReactivate(member.id)}>
                                  Reactivate
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td
                      colSpan={showActions ? 7 : 6}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      No staff members match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-4 w-4" /> Department Summary
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {deptSummary.map((dept) => (
                <div key={dept.name} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="font-serif font-semibold">{dept.name}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{dept.count}</div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {dept.roles.join(" · ")}
                  </p>
                </div>
              ))}
              {deptSummary.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">
                  No active staff in the current view.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Invite Staff</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(handleInvite)} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                {...register("name")}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                {...register("email")}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                {...register("role")}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]} — {ROLE_DEPARTMENT[r]}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {isSubmitting ? "Sending invite…" : "Send Invite"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to the system. This can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deactivateTarget && handleDeactivate(deactivateTarget.id)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleErrorBoundary>
  );
}
