import { createRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { ErrorPage, NotFoundPage } from "@/components/status-page";
import { queryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return new Error(error.message);
  }
  return new Error("An unexpected error occurred.");
}

function RouterPending() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPendingComponent: RouterPending,
  defaultPendingMs: 0,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ({ error }) => (
    <ErrorPage error={normalizeError(error)} />
  ),
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
