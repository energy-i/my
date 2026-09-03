import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";
import * as React from "react";

import {
  computeWindow,
  ConsumptionChart,
  parseRangeSearch,
  type Range,
  rangeSearchSchema,
  toRangeSearch,
} from "@/components/consumption-chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAreaConsumption, getSiteAreas } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ConsumptionBreakdownItem, ConsumptionPoint } from "@/lib/types";

export const Route = createFileRoute("/_authed/sites/$id/areas/$areaId")({
  validateSearch: (search) => rangeSearchSchema.parse(search),
  loader: async ({ context, params }) => {
    // The parent site layout has already resolved the site. Ensuring the
    // site's areas here lets the component look up the area name from the
    // same cache and 404 early if the id doesn't belong to this site.
    const areas = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.siteAreas(params.id),
      queryFn: () => getSiteAreas(params.id),
    });
    if (!areas.some((area) => area.id === params.areaId)) {
      throw notFound();
    }
  },
  component: AreaDetailPage,
});

function AreaDetailPage() {
  const { id: siteId, areaId } = Route.useParams();
  const navigate = useNavigate({ from: "/sites/$id/areas/$areaId" });
  const search = Route.useSearch();
  const range = React.useMemo(() => parseRangeSearch(search), [search]);

  const setRange = (next: Range) => {
    navigate({ search: () => toRangeSearch(next) });
  };

  const { data: areas } = useQuery({
    queryKey: queryKeys.siteAreas(siteId),
    queryFn: () => getSiteAreas(siteId),
  });
  const area = areas?.find((a) => a.id === areaId);

  const consumptionQuery = useQuery({
    queryKey: queryKeys.areaConsumption(areaId, toRangeSearch(range)),
    queryFn: () => getAreaConsumption(areaId, computeWindow(range)),
    refetchInterval: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  if (!area) return null;

  const appliances = consumptionQuery.data?.breakdown ?? [];
  const unit = consumptionQuery.data?.unit || "kWh";
  const areaTotal = appliances.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <ConsumptionChart
        consumption={consumptionQuery.data}
        isFetching={consumptionQuery.isFetching}
        range={range}
        onRangeChange={setRange}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Appliances</h2>
        <AppliancesTable
          appliances={appliances}
          areaTotal={areaTotal}
          unit={unit}
          isPending={consumptionQuery.isPending}
        />
      </section>
    </div>
  );
}

function AppliancesTable({
  appliances,
  areaTotal,
  unit,
  isPending,
}: {
  appliances: ConsumptionBreakdownItem[];
  areaTotal: number;
  unit: string;
  isPending: boolean;
}) {
  const rows = React.useMemo(() => {
    return appliances
      .map((item) => {
        const readings = item.series.filter(
          (point): point is ConsumptionPoint & { value: number } =>
            point.value !== null,
        );
        const dailyAverage =
          readings.length > 0 ? item.total / readings.length : 0;
        const peak = readings.reduce<{
          timestamp: string;
          value: number;
        } | null>((best, point) => {
          if (!best || point.value > best.value) return point;
          return best;
        }, null);
        const share = areaTotal > 0 ? item.total / areaTotal : 0;
        return { ...item, dailyAverage, peak, share };
      })
      .sort((a, b) => b.total - a.total);
  }, [appliances, areaTotal]);

  if (appliances.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>No appliances</AlertTitle>
        <AlertDescription>
          {isPending
            ? "Loading appliance consumption…"
            : "This area does not have any appliances yet."}
        </AlertDescription>
      </Alert>
    );
  }

  const numberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  });
  const percentFormatter = new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Appliance</TableHead>
          <TableHead className="text-right">Total ({unit})</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="text-right">Daily avg ({unit})</TableHead>
          <TableHead className="text-right">Peak day</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">
              {numberFormatter.format(row.total)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {percentFormatter.format(row.share)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {numberFormatter.format(row.dailyAverage)}
            </TableCell>
            <TableCell className="text-right">
              {row.peak ? (
                <div>
                  <div className="tabular-nums">
                    {numberFormatter.format(row.peak.value)} {unit}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(row.peak.timestamp))}
                  </div>
                </div>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
