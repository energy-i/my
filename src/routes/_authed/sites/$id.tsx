import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useMatches,
} from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSite, getSiteAreas } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/_authed/sites/$id")({
  loader: async ({ context, params }) => {
    const site = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.site(params.id),
      queryFn: () => getSite(params.id),
    });
    if (!site) throw notFound();
  },
  component: SiteLayout,
});

function SiteLayout() {
  const { id } = Route.useParams();
  const { data: site } = useSuspenseQuery({
    queryKey: queryKeys.site(id),
    queryFn: () => getSite(id),
  });

  // Inspect the currently-matched leaf route so the breadcrumb can adapt
  // to whichever sub-page the user is on (edit, area detail, etc.).
  const matches = useMatches();
  const areaMatch = matches.find(
    (m) => m.routeId === "/_authed/sites/$id/areas/$areaId",
  );
  const editMatch = matches.find(
    (m) => m.routeId === "/_authed/sites/$id/edit",
  );

  const areaId = (areaMatch?.params as { areaId?: string } | undefined)?.areaId;
  const { data: areas } = useQuery({
    queryKey: queryKeys.siteAreas(id),
    queryFn: () => getSiteAreas(id),
    enabled: Boolean(areaId),
  });
  const areaName =
    areaId != null ? (areas?.find((a) => a.id === areaId)?.name ?? null) : null;

  const trailingCrumb = areaMatch
    ? (areaName ?? "Area")
    : editMatch
      ? "Edit"
      : null;

  if (!site) return null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/sites">Sites</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {trailingCrumb !== null ? (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link to="/sites/$id" params={{ id }}>
                        {site.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbPage className="hidden md:block">
                    {trailingCrumb}
                  </BreadcrumbPage>
                </>
              ) : (
                <BreadcrumbPage className="hidden md:block">
                  {site.name}
                </BreadcrumbPage>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 flex-col gap-4 p-4 pt-0 space-y-4">
        <Outlet />
      </div>
    </>
  );
}
