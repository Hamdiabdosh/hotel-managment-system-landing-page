import { createFileRoute } from "@tanstack/react-router";
import { MOCK_SESSION } from "@/lib/auth/types";

/** NextAuth v5 skeleton — returns mock session for GET, stub for POST. */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(MOCK_SESSION), {
          headers: { "Content-Type": "application/json" },
        }),
      POST: () =>
        new Response(JSON.stringify({ ok: true, message: "Auth handler stub" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
