import { createFileRoute } from "@tanstack/react-router";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  return (
    <ModuleErrorBoundary module="Profile">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {user.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="mt-1 inline-block rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Profile editing will be available in a future update.
        </p>
      </div>
    </ModuleErrorBoundary>
  );
}
