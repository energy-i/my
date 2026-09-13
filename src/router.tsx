import { createRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { ErrorPage, NotFoundPage } from "@/components/status-page";
import { queryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

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
    <ErrorPage error={error instanceof Error ? error : undefined} />
  ),
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
