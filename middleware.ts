import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/stripe",
]);

/** App Router API handlers use `auth()` / `getIsAdmin()` and return JSON errors. */
const isApiRoute = createRouteMatcher(["/api(.*)"]);

/**
 * Next.js Server Actions POST to the current page URL with a `next-action` header.
 * Clerk (e.g. keyless / `detectKeylessEnvDriftAction`) uses this from `ClerkProvider`.
 * Calling `auth.protect()` on those requests treats them as non-document fetches and
 * returns 404 — so we skip protect and let the action + `auth()` run on the server.
 */
function isNextjsServerActionPost(request: { method?: string; headers?: Headers }): boolean {
  return request.method === "POST" && Boolean(request.headers?.get("next-action"));
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const e2eBypassSecret = process.env.E2E_BYPASS_AUTH_SECRET;
    const canBypass =
      process.env.NODE_ENV !== "production" &&
      !!e2eBypassSecret &&
      request.headers?.get?.("x-e2e-test-bypass") === e2eBypassSecret &&
      request.nextUrl?.pathname === "/api/chat";

    if (canBypass) {
      return;
    }
    // Avoid auth.protect() on /api/* — it rewrites to Clerk dev HTML (404) so fetch().json() breaks.
    // Avoid auth.protect() on Server Action POSTs — Clerk + Next would otherwise 404 on /learn, etc.
    if (!isApiRoute(request) && !isNextjsServerActionPost(request)) {
      await auth.protect();
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
