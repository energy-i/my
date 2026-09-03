import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BellIcon,
  BuildingIcon,
  ListIcon,
  LockIcon,
  RulerIcon,
  ZapIcon,
} from "lucide-react";
import type * as React from "react";

import { AlertsList } from "@/components/alerts-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAlerts, getOrganisation } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AlertType } from "@/lib/types";

// Order used when picking the "priority" alerts to surface on the dashboard.
// ALERTs go first (things to act on), then OPPORTUNITYs, then INSIGHTs.
const ALERT_PRIORITY: Record<AlertType, number> = {
  ALERT: 0,
  OPPORTUNITY: 1,
  INSIGHT: 2,
};

const PRIORITY_ALERTS_LIMIT = 5;
const TOP_SITES_LIMIT = 5;

// Client-side priority sort is applied over the fetched batch, so grab a
// reasonable-sized window (the API's max page size) to keep results stable
// when there are more than a handful of alerts. Matches the previous
// unbounded fetch as closely as pagination allows.
const DASHBOARD_ALERTS_FETCH_SIZE = 100;

export const Route = createFileRoute("/_authed/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: organisation } = useQuery({
    queryKey: queryKeys.organisation,
    queryFn: getOrganisation,
  });

  const hasSites = !!organisation && organisation.sites.length > 0;
  const hasAlertsAccess = !!organisation?.hasAlertsAccess;

  const { data: alertsData } = useQuery({
    queryKey: queryKeys.alerts({
      view: "active",
      page: 1,
      pageSize: DASHBOARD_ALERTS_FETCH_SIZE,
      type: [],
    }),
    queryFn: () => getAlerts({ pageSize: DASHBOARD_ALERTS_FETCH_SIZE }),
    // No point querying alerts before we know the org has been onboarded,
    // or if the org is gated out of the alerts feature entirely.
    enabled: hasSites && hasAlertsAccess,
  });

  const sites = organisation?.sites ?? [];
  const alerts = alertsData?.alerts ?? [];

  const totalArea = sites.reduce((sum, s) => sum + (s.area ?? 0), 0);
  const totalEac = sites.reduce((sum, s) => sum + (s.eac ?? 0), 0);

  // Surface the alerts most likely to need action first, breaking ties by
  // recency so a stale INSIGHT never buries a fresh ALERT.
  const priorityAlerts = [...alerts]
    .sort((a, b) => {
      const p = ALERT_PRIORITY[a.type] - ALERT_PRIORITY[b.type];
      if (p !== 0) return p;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, PRIORITY_ALERTS_LIMIT);

  const topSites = [...sites]
    .sort((a, b) => (b.eac ?? 0) - (a.eac ?? 0))
    .slice(0, TOP_SITES_LIMIT);

  const numberFormatter = new Intl.NumberFormat();

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
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex-1 flex flex-col gap-8 p-4 pt-0 space-y-4">
        {!hasSites ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListIcon />
              </EmptyMedia>
              <EmptyTitle>Welcome to Energy-i</EmptyTitle>
              <EmptyDescription>
                We need to onboard your first site, please get in touch with us.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <a href="mailto:help@energy-i.ai?subject=Energy-i%20Support">
                  Contact us
                </a>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Sites"
                value={numberFormatter.format(sites.length)}
                Icon={BuildingIcon}
              />
              <StatCard
                label="Floor area"
                value={numberFormatter.format(Math.round(totalArea))}
                unit="m²"
                Icon={RulerIcon}
              />
              <StatCard
                label="Est. annual consumption"
                value={numberFormatter.format(Math.round(totalEac))}
                unit="kWh"
                Icon={ZapIcon}
              />
              <StatCard
                label="Active alerts"
                value={
                  hasAlertsAccess ? (
                    numberFormatter.format(alerts.length)
                  ) : (
                    <LockIcon
                      className="size-5 text-muted-foreground"
                      aria-label="Alerts locked"
                    />
                  )
                }
                Icon={BellIcon}
              />
            </div>

            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-heading text-base leading-normal font-semibold">
                    Priority alerts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The most important issues, opportunities and insights across
                    your portfolio.
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/alerts" search={{ view: "active" }}>
                    View all
                  </Link>
                </Button>
              </div>
              {hasAlertsAccess ? (
                priorityAlerts.length > 0 ? (
                  <AlertsList alerts={priorityAlerts} />
                ) : (
                  <Alert>
                    <AlertDescription>
                      No active alerts. Nothing needs your attention right now.
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <Alert>
                  <LockIcon />
                  <AlertDescription>
                    Alerts is an Optimise-tier feature. Upgrade any site to the
                    Optimise tier to start receiving alerts, opportunities, and
                    insights.
                  </AlertDescription>
                </Alert>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-heading text-base leading-normal font-semibold">
                    Top sites by consumption
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Highest-EAC sites — good candidates to focus optimisation
                    efforts on.
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/sites">View all</Link>
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Area (m²)</TableHead>
                    <TableHead className="text-right">EAC (kWh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <Link
                          to="/sites/$id"
                          params={{ id: site.id }}
                          className="font-medium hover:underline"
                        >
                          {site.name}
                        </Link>
                      </TableCell>
                      <TableCell>{site.city}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {site.area !== null
                          ? numberFormatter.format(site.area)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {site.eac !== null
                          ? numberFormatter.format(site.eac)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  unit,
  Icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
