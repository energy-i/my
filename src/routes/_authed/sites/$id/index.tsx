import { usePostHog } from "@posthog/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, InfoIcon } from "lucide-react";
import * as React from "react";
import * as z from "zod";

import { AlertsList } from "@/components/alerts-list";
import {
  computeWindow,
  ConsumptionChart,
  type Range,
  RANGE_LABEL,
  useDefaultRange,
} from "@/components/consumption-chart";
import { TablePagination } from "@/components/table-pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSite,
  getSiteAlerts,
  getSiteAreas,
  getSiteConsumption,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Site } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALERTS_PAGE_SIZE = 25;

const TABS = ["consumption", "alerts", "details"] as const;
type SiteTab = (typeof TABS)[number];

const searchSchema = z.object({
  tab: z.enum(TABS).catch("consumption").optional(),
  // Only meaningful when `tab === "alerts"`; carried through router state so
  // pagination survives reloads and back/forward navigation.
  page: z.coerce.number().int().min(1).catch(1).optional(),
});

export const Route = createFileRoute("/_authed/sites/$id/")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SiteDetailPage,
});

function SiteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate({ from: "/sites/$id" });
  const { tab = "consumption" } = Route.useSearch();
  const posthog = usePostHog();

  // The parent `$id.tsx` route already ensured the site loads. Reading it
  // here from the same query key just hits the cache.
  const { data: site } = useQuery({
    queryKey: queryKeys.site(id),
    queryFn: () => getSite(id),
  });

  const handleTabChange = (next: string) => {
    if (next === tab) return;
    if (posthog) {
      posthog.capture("site_tab_changed", { tab: next, site_id: id });
    }
    navigate({
      search: (prev) => ({
        ...prev,
        tab: next === "consumption" ? undefined : (next as SiteTab),
        // Reset the alerts pager whenever the tab changes.
        page: undefined,
      }),
    });
  };

  if (!site) return null;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={handleTabChange} className="w-fit">
        <TabsList>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "consumption" ? <ConsumptionTab siteId={id} /> : null}
      {tab === "alerts" ? <AlertsTab siteId={id} /> : null}
      {tab === "details" ? <DetailsTab site={site} /> : null}
    </div>
  );
}

function ConsumptionTab({ siteId }: { siteId: string }) {
  const defaultRange = useDefaultRange();
  const [userRange, setUserRange] = React.useState<Range | null>(null);
  const range: Range = userRange ?? defaultRange;

  const consumptionQuery = useQuery({
    queryKey: queryKeys.siteConsumption(siteId, range),
    queryFn: () =>
      getSiteConsumption(siteId, {
        ...computeWindow(range),
        interval: "day",
      }),
    placeholderData: (prev) => prev,
  });

  const areasQuery = useQuery({
    queryKey: queryKeys.siteAreas(siteId),
    queryFn: () => getSiteAreas(siteId),
  });
  const areas = areasQuery.data ?? [];

  // Map area id -> total consumption over the selected range so each card
  // can show a number that matches the chart above.
  const totalsByArea = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of consumptionQuery.data?.breakdown ?? []) {
      map.set(item.id, item.total);
    }
    return map;
  }, [consumptionQuery.data]);
  const unit = consumptionQuery.data?.unit || "kWh";

  return (
    <div className="flex flex-col gap-8">
      <ConsumptionChart
        consumption={consumptionQuery.data}
        isFetching={consumptionQuery.isFetching}
        range={range}
        onRangeChange={setUserRange}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Areas</h2>
        {areas.length === 0 ? (
          <Alert>
            <InfoIcon />
            <AlertTitle>No areas</AlertTitle>
            <AlertDescription>
              This site does not have any areas yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => {
              const total = totalsByArea.get(area.id);
              const formattedTotal =
                total !== undefined
                  ? total.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })
                  : null;
              return (
                <Link
                  key={area.id}
                  to="/sites/$id/areas/$areaId"
                  params={{ id: siteId, areaId: area.id }}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle>{area.name}</CardTitle>
                          <CardDescription>
                            {area._count.appliances}{" "}
                            {area._count.appliances === 1
                              ? "appliance"
                              : "appliances"}
                          </CardDescription>
                        </div>
                        <ChevronRightIcon
                          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {formattedTotal !== null ? (
                        <>
                          <p className="text-2xl font-semibold tabular-nums">
                            {formattedTotal}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              {unit}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {RANGE_LABEL[range]}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {consumptionQuery.isPending
                            ? "Loading…"
                            : "No consumption data"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function AlertsTab({ siteId }: { siteId: string }) {
  const navigate = useNavigate({ from: "/sites/$id" });
  const { page = 1 } = Route.useSearch();

  const { data } = useQuery({
    queryKey: queryKeys.siteAlerts(siteId, {
      page,
      pageSize: ALERTS_PAGE_SIZE,
    }),
    queryFn: () => getSiteAlerts(siteId, { page, pageSize: ALERTS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const alerts = data?.alerts ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const currentPage = data?.pagination.page ?? page;

  const handlePageChange = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, page: next }) });

  if (alerts.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>No alerts</AlertTitle>
        <AlertDescription>
          This site has no active alerts, opportunities, or insights.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AlertsList alerts={alerts} />
      <TablePagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

function DetailsTab({ site }: { site: Site }) {
  const numberFormatter = new Intl.NumberFormat();
  const coordFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 5,
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const address = [site.addressLine1, site.city, site.postcode]
    .filter(Boolean)
    .join(", ");
  const coords =
    site.latitude !== null && site.longitude !== null
      ? `${coordFormatter.format(site.latitude)}, ${coordFormatter.format(site.longitude)}`
      : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailItem label="Address line 1" value={site.addressLine1} />
          <DetailItem label="City" value={site.city} />
          <DetailItem label="Postcode" value={site.postcode} />
          <DetailItem label="Full address" value={address || null} />
          <DetailItem label="Coordinates" value={coords} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailItem label="Name" value={site.name} />
          <DetailItem label="Sector" value={site.sector} />
          <DetailItem
            label="Area (m²)"
            value={
              site.area !== null ? numberFormatter.format(site.area) : null
            }
          />
          <DetailItem
            label="EAC (kWh)"
            value={site.eac !== null ? numberFormatter.format(site.eac) : null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metering</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailItem label="Meter type" value={site.meterType} />
          <DetailItem label="Comms vendor" value={site.commsVendor} />
          <DetailItem label="Comms ID" value={site.commsId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailItem
            label="Created"
            value={dateFormatter.format(new Date(site.createdAt))}
          />
          <DetailItem
            label="Last updated"
            value={dateFormatter.format(new Date(site.updatedAt))}
          />
          <DetailItem label="Site ID" value={site.id} mono />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm not-first:border-t not-first:border-border/60 not-first:pt-3 not-first:mt-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "col-span-2 wrap-break-word",
          mono && "font-mono text-xs",
          value === null && "text-muted-foreground italic",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
