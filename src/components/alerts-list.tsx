import { usePostHog } from "@posthog/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BellIcon,
  BellOffIcon,
  InfoIcon,
  LightbulbIcon,
  Loader2,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type AlertPatch, patchAlert } from "@/lib/api";
import type { AlertType, SiteAlert } from "@/lib/types";

const TYPE_META: Record<
  AlertType,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    variant: "default" | "destructive";
    badgeVariant: "destructive" | "default" | "secondary";
  }
> = {
  ALERT: {
    label: "Alert",
    Icon: TriangleAlertIcon,
    variant: "destructive",
    badgeVariant: "destructive",
  },
  OPPORTUNITY: {
    label: "Opportunity",
    Icon: LightbulbIcon,
    variant: "default",
    badgeVariant: "default",
  },
  INSIGHT: {
    label: "Insight",
    Icon: InfoIcon,
    variant: "default",
    badgeVariant: "secondary",
  },
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

function formatRelative(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (abs >= seconds || unit === "second") {
      return rtf.format(Math.round(diffSec / seconds), unit);
    }
  }
  return rtf.format(Math.round(diffSec), "second");
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Default snooze duration. Could later be surfaced as a dropdown.
const SNOOZE_HOURS = 24;

// The component accepts either per-site alerts (no `site` field) or org-wide
// alerts joined with their site — the site link is only rendered when present.
type AlertItem = SiteAlert & {
  site?: { id: string; name: string };
};

export function AlertsList({ alerts }: { alerts: AlertItem[] }) {
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AlertPatch }) =>
      patchAlert(id, data),
    onSuccess: () => {
      // Refetch every alerts-related query so items move between the
      // active / snoozed views according to their new state.
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const runPatch = (
    alert: AlertItem,
    data: AlertPatch,
    successMessage: string,
    errorMessage: string,
  ) => {
    mutation.mutate(
      { id: alert.id, data },
      {
        onSuccess: () =>
          toast.success(successMessage, { description: alert.title }),
        onError: () => toast.error(errorMessage),
      },
    );
  };

  const handleSnooze = (alert: AlertItem) => {
    if (posthog) {
      posthog.capture("alert_snoozed", {
        alert_id: alert.id,
        alert_type: alert.type,
        site_id: alert.siteId,
        snooze_hours: SNOOZE_HOURS,
      });
    }
    runPatch(
      alert,
      {
        snoozedUntil: new Date(
          Date.now() + SNOOZE_HOURS * 60 * 60 * 1000,
        ).toISOString(),
      },
      `Snoozed for ${SNOOZE_HOURS} hours`,
      "Failed to snooze alert",
    );
  };

  const handleUnsnooze = (alert: AlertItem) =>
    runPatch(
      alert,
      { snoozedUntil: null },
      "Unsnoozed",
      "Failed to unsnooze alert",
    );

  const handleDismiss = (alert: AlertItem) => {
    if (posthog) {
      posthog.capture("alert_dismissed", {
        alert_id: alert.id,
        alert_type: alert.type,
        site_id: alert.siteId,
      });
    }
    runPatch(
      alert,
      { dismissedAt: new Date().toISOString() },
      "Dismissed",
      "Failed to dismiss alert",
    );
  };

  const pendingId =
    mutation.isPending && mutation.variables ? mutation.variables.id : null;
  const now = Date.now();

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => {
        const meta = TYPE_META[alert.type];
        const Icon = meta.Icon;
        const isPending = pendingId === alert.id;
        const isCurrentlySnoozed =
          alert.snoozedUntil !== null &&
          new Date(alert.snoozedUntil).getTime() > now;

        return (
          <Alert
            key={alert.id}
            variant={meta.variant}
            className="has-data-[slot=alert-action]:pr-40"
          >
            <Icon />
            <AlertTitle className="flex flex-wrap items-center gap-2">
              {alert.title}
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              <time
                dateTime={alert.createdAt}
                title={formatAbsolute(alert.createdAt)}
                suppressHydrationWarning
                className="text-xs font-normal text-muted-foreground"
              >
                {formatRelative(alert.createdAt)}
              </time>
              {alert.site ? (
                <Link
                  to="/sites/$id"
                  params={{ id: alert.site.id }}
                  className="text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
                >
                  {alert.site.name}
                </Link>
              ) : null}
            </AlertTitle>
            <AlertDescription>
              {alert.description}
              {isCurrentlySnoozed && alert.snoozedUntil ? (
                <span
                  className="mt-1 block text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  Snoozed until {formatAbsolute(alert.snoozedUntil)}
                </span>
              ) : null}
            </AlertDescription>
            {isCurrentlySnoozed ? (
              <AlertAction className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isPending}
                  onClick={() => handleUnsnooze(alert)}
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <BellIcon />
                  )}
                  Unsnooze
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isPending}
                  onClick={() => handleDismiss(alert)}
                >
                  <XIcon />
                  Dismiss
                </Button>
              </AlertAction>
            ) : (
              <AlertAction className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isPending}
                  onClick={() => handleSnooze(alert)}
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <BellOffIcon />
                  )}
                  Snooze
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={isPending}
                  onClick={() => handleDismiss(alert)}
                >
                  <XIcon />
                  Dismiss
                </Button>
              </AlertAction>
            )}
          </Alert>
        );
      })}
    </div>
  );
}
