import { usePostHog } from "@posthog/react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getMe } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.me,
      queryFn: getMe,
      // Without this, `ensureQueryData` returns any cached value (including a
      // `null` from a prior 401), even if it has been invalidated. That would
      // trap us on /sign-in after a successful login until a full reload.
      revalidateIfStale: true,
    });

    if (!user) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }

    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && user) {
      posthog.identify(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [posthog, user]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
