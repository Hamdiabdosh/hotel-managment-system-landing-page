import { createFileRoute } from "@tanstack/react-router";
import { getCurrentSession } from "@/lib/api/auth.functions";

/** Returns the current session JSON for client-side auth checks. */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getCurrentSession();
        return new Response(JSON.stringify(session), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: () =>
        new Response(JSON.stringify({ error: "Use the login server function" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
