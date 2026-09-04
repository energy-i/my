import { usePostHog } from "@posthog/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  InfoIcon,
  LightbulbIcon,
  LockIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type * as React from "react";
import * as z from "zod";

import { AlertsList } from "@/components/alerts-list";
import { TablePagination } from "@/components/table-pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getAlerts } from "@/lib/api";
import { getOrganisation } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AlertType } from "@/lib/types";

const PAGE_SIZE = 25;

const ALERT_TYPES = [
  "ALERT",
  "OPPORTUNITY",
  "INSIGHT",
] as const satisfies readonly AlertType[];

const TYPE_FILTERS: {
  value: AlertType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "ALERT", label: "Alerts", Icon: TriangleAlertIcon },
  { value: "OPPORTUNITY", label: "Opportunities", Icon: LightbulbIcon },
  { value: "INSIGHT", label: "Insights", Icon: InfoIcon },
];

const searchSchema = z.object({
  view: z.enum(["active", "snoozed"]).catch("active"),
  type: z.array(z.enum(ALERT_TYPES)).catch([]).optional(),
  page: z.coerce.number().int().min(1).catch(1).optional(),
});

type AlertsView = z.infer<typeof searchSchema>["view"];

export const Route = createFileRoute("/_authed/alerts")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AlertsPage,
});

function AlertsPage() {
  const { user } = Route.useRouteContext();
  const { data: organisation } = useQuery({
    queryKey: queryKeys.organisation,
    queryFn: getOrganisation,
  });
  const hasAlertsAccess =
    user.organisation.hasAlertsAccess ||
    organisation?.sites.some((site) => site.tier === "OPTIMISE") === true;
  const navigate = useNavigate({ from: "/alerts" });
  const { view, type = [], page = 1 } = Route.useSearch();
  const posthog = usePostHog();

  const { data } = useQuery({
    queryKey: queryKeys.alerts({
      view,
      page,
      pageSize: PAGE_SIZE,
      type,
    }),
    queryFn: () =>
      getAlerts({
        snoozedOnly: view === "snoozed",
        type: type.length > 0 ? type : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
    enabled: hasAlertsAccess,
  });

  const alerts = data?.alerts ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const currentPage = data?.pagination.page ?? page;
  const hasFilter = type.length > 0;

  const handleViewChange = (next: string) => {
    if (next === view) return;
    // Switching tabs resets the pager; type filter is preserved.
    navigate({
      search: (prev) => ({
        ...prev,
        view: next as AlertsView,
        page: undefined,
      }),
    });
  };

  const handleTypeChange = (values: string[]) => {
    const next = values.filter((v): v is AlertType =>
      (ALERT_TYPES as readonly string[]).includes(v),
    );
    if (posthog) {
      posthog.capture("alerts_filter_changed", {
        filter_types: next,
        view,
      });
    }
    navigate({
      search: (prev) => ({
        ...prev,
        type: next.length > 0 ? next : undefined,
        page: undefined,
      }),
    });
  };

  const handlePageChange = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, page: next }) });

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
              <BreadcrumbPage className="hidden md:block">
                Alerts
              </BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {hasAlertsAccess ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                spacing={0}
                value={type}
                onValueChange={handleTypeChange}
                aria-label="Filter by type"
              >
                {TYPE_FILTERS.map(({ value, label, Icon }) => (
                  <ToggleGroupItem key={value} value={value} aria-label={label}>
                    <Icon className="size-3.5" />
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <Tabs
                value={view}
                onValueChange={handleViewChange}
                className="w-fit"
              >
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="snoozed">Snoozed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {alerts.length === 0 ? (
              <Alert>
                <InfoIcon />
                <AlertTitle>
                  No {view === "snoozed" ? "snoozed" : "active"}
                  {hasFilter ? " matching" : ""} alerts
                </AlertTitle>
                <AlertDescription>
                  {hasFilter
                    ? "No alerts match the current type filter."
                    : view === "snoozed"
                      ? "You haven't snoozed any alerts."
                      : "You have no active alerts, opportunities, or insights."}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <AlertsList alerts={alerts} />
                <TablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </>
        ) : (
          <Alert>
            <LockIcon />
            <AlertTitle>Alerts is an Optimise-tier feature</AlertTitle>
            <AlertDescription>
              Upgrade any site to the Optimise tier to start receiving alerts,
              opportunities, and insights across your organisation.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}
