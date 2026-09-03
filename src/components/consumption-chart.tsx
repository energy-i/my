import { usePostHog } from "@posthog/react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import * as z from "zod";

import {
  type DateRange,
  DateRangePicker,
  formatDateRange,
} from "@/components/date-range-picker";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  Consumption,
  ConsumptionBreakdownItem,
  ConsumptionInterval,
} from "@/lib/types";
import { cn } from "@/lib/utils";

dayjs.extend(utc);

export type Range = { from: Date; to: Date };

/** Widest range the API will accept, mirrored from `consumptionQuerySchema`. */
export const MAX_RANGE_DAYS = 366;

const SEARCH_DATE_FORMAT = "YYYY-MM-DD";

// Cycle through the shadcn chart palette defined in globals.css.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function defaultRange(): Range {
  const today = dayjs();
  return {
    from: today.startOf("day").toDate(),
    to: today.endOf("day").toDate(),
  };
}

export function rangeDays(range: Range): number {
  return dayjs(range.to).diff(range.from, "day", true);
}

/** Pick a bucket size that keeps the series to a readable number of points. */
export function deriveInterval(range: Range): ConsumptionInterval {
  const days = rangeDays(range);
  if (days <= 2) return "halfHour";
  if (days <= 14) return "hour";
  if (days <= 180) return "day";
  return "month";
}

export function computeWindow(range: Range): {
  from: string;
  to: string;
  interval: ConsumptionInterval;
} {
  return {
    from: dayjs(range.from).format(SEARCH_DATE_FORMAT),
    to: dayjs(range.to).format(SEARCH_DATE_FORMAT),
    interval: deriveInterval(range),
  };
}

export function formatRange(range: Range): string {
  return formatDateRange(range);
}

/** `from`/`to` are held in the URL as local `yyyy-mm-dd` days. */
export const rangeSearchSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type RangeSearch = z.infer<typeof rangeSearchSchema>;

export function toRangeSearch(range: Range): Required<RangeSearch> {
  return {
    from: dayjs(range.from).format(SEARCH_DATE_FORMAT),
    to: dayjs(range.to).format(SEARCH_DATE_FORMAT),
  };
}

/** Falls back to the default window if the URL holds a missing or invalid range. */
export function parseRangeSearch(search: RangeSearch): Range {
  if (!search.from || !search.to) return defaultRange();
  // Zod has already enforced `YYYY-MM-DD`; dayjs parses that as a local day.
  const from = dayjs(search.from).startOf("day");
  const to = dayjs(search.to).endOf("day");
  if (!from.isValid() || !to.isValid()) return defaultRange();

  const range = { from: from.toDate(), to: to.toDate() };
  if (!from.isBefore(to) || rangeDays(range) > MAX_RANGE_DAYS) {
    return defaultRange();
  }
  return range;
}

// Prefix keys so they never collide with the reserved `timestamp` field even
// if a breakdown item is named "timestamp".
const seriesKey = (id: string) => `s_${id}`;

type ChartRow = { timestamp: string } & Record<string, number | string | null>;

function buildChartData(breakdown: ConsumptionBreakdownItem[]): ChartRow[] {
  const byTimestamp = new Map<string, ChartRow>();

  for (const item of breakdown) {
    const key = seriesKey(item.id);
    for (const point of item.series) {
      let row = byTimestamp.get(point.timestamp);
      if (!row) {
        row = { timestamp: point.timestamp };
        byTimestamp.set(point.timestamp, row);
      }
      row[key] = point.value;
    }
  }

  const rows = Array.from(byTimestamp.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  return rows;
}

function buildChartConfig(breakdown: ConsumptionBreakdownItem[]): ChartConfig {
  const config: ChartConfig = {};
  breakdown.forEach((item, index) => {
    config[seriesKey(item.id)] = {
      label: item.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });
  return config;
}

type ConsumptionChartProps = {
  consumption: Consumption | undefined;
  isFetching: boolean;
  range: Range;
  onRangeChange: (range: Range) => void;
  title?: string;
};

export function ConsumptionChart({
  consumption,
  isFetching,
  range,
  onRangeChange,
  title = "Consumption",
}: ConsumptionChartProps) {
  const posthog = usePostHog();
  const breakdown = React.useMemo(
    () => consumption?.breakdown ?? [],
    [consumption],
  );
  const chartConfig = React.useMemo(
    () => buildChartConfig(breakdown),
    [breakdown],
  );
  const chartData = React.useMemo(() => buildChartData(breakdown), [breakdown]);
  const total = React.useMemo(
    () => breakdown.reduce((sum, item) => sum + item.total, 0),
    [breakdown],
  );

  const unit = consumption?.unit || "kWh";
  const formattedTotal = total.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  const interval = deriveInterval(range);
  const showTime = interval === "halfHour" || interval === "hour";

  // Keep the picker inside the window the API will accept.
  const earliest = React.useMemo(
    () => dayjs().subtract(MAX_RANGE_DAYS, "day").toDate(),
    [],
  );

  const handleRangeChange = (next: DateRange) => {
    if (!next.from || !next.to) return;
    const range = { from: next.from, to: next.to };
    if (posthog) {
      posthog.capture("consumption_range_changed", {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        days: Math.round(rangeDays(range)),
        scope: consumption?.scope,
        scope_id: consumption?.id,
      });
    }
    onRangeChange(range);
  };

  return (
    <div className="@container/chart flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <DateRangePicker
          value={range}
          onChange={handleRangeChange}
          minDate={earliest}
          ariaLabel="Select a consumption date range"
        />
      </div>
      <ChartContainer
        config={chartConfig}
        className={cn(
          "aspect-auto h-62.5 w-full transition-opacity",
          isFetching && "opacity-60",
        )}
      >
        <AreaChart data={chartData}>
          <defs>
            {breakdown.map((item) => {
              const key = seriesKey(item.id);
              return (
                <linearGradient
                  key={key}
                  id={`fill-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) =>
              dayjs.utc(value).format(showTime ? "MMM D, h:mm A" : "MMM D")
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={(value: number) =>
              value.toLocaleString(undefined, { maximumFractionDigits: 0 })
            }
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  dayjs
                    .utc(value as string)
                    .format(showTime ? "MMM D, YYYY h:mm A" : "MMM D, YYYY")
                }
                indicator="dot"
              />
            }
          />
          {breakdown.map((item) => {
            const key = seriesKey(item.id);
            return (
              <Area
                key={key}
                dataKey={key}
                name={key}
                type="natural"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                stackId="consumption"
              />
            );
          })}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
