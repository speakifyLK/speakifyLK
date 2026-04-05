import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/stripe",
]);

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
    await auth.protect();
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
