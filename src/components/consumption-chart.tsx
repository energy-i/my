import { usePostHog } from "@posthog/react";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Consumption, ConsumptionBreakdownItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Range = "7d" | "30d" | "90d";

export const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 3 months",
};

// Cycle through the shadcn chart palette defined in globals.css.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function computeWindow(range: Range): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - RANGE_DAYS[range]);
  return { from: from.toISOString(), to: to.toISOString() };
}

// Prefix keys so they never collide with the reserved `timestamp` field even
// if a breakdown item is named "timestamp".
const seriesKey = (id: string) => `s_${id}`;

type ChartRow = { timestamp: string } & Record<string, number | string>;

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

  // Fill in missing values so stacked areas render continuously.
  const rows = Array.from(byTimestamp.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  for (const row of rows) {
    for (const item of breakdown) {
      const key = seriesKey(item.id);
      if (row[key] === undefined) row[key] = 0;
    }
  }
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

// Default range: 7d on mobile, 90d elsewhere. Returned as a derived value so
// callers don't need to sync state with useEffect.
export function useDefaultRange(): Range {
  const isMobile = useIsMobile();
  return isMobile ? "7d" : "90d";
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

  const handleRangeChange = (next: string) => {
    if (!next || next === range) return;
    if (posthog) {
      posthog.capture("consumption_range_changed", {
        range: next,
        scope: consumption?.scope,
        scope_id: consumption?.id,
      });
    }
    onRangeChange(next as Range);
  };

  return (
    <div className="@container/chart flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="hidden @[540px]/chart:inline">
              {formattedTotal} {unit} total · {RANGE_LABEL[range]}
            </span>
            <span className="@[540px]/chart:hidden">
              {formattedTotal} {unit}
            </span>
          </p>
        </div>
        <div>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={handleRangeChange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/chart:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={range} onValueChange={handleRangeChange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/chart:hidden"
              size="sm"
              aria-label="Select a range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              new Date(value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
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
                  new Date(value as string).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
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
