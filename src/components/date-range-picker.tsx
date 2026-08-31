import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange, Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type { DateRange };

const DISPLAY_FORMAT = "D MMM YYYY";

export function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "Pick a date range";
  const from = dayjs(range.from).format(DISPLAY_FORMAT);
  if (!range.to) return from;
  return `${from} – ${dayjs(range.to).format(DISPLAY_FORMAT)}`;
}

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Latest selectable day. Defaults to today. */
  maxDate?: Date;
  /** Earliest selectable day. */
  minDate?: Date;
  className?: string;
  ariaLabel?: string;
};

export function DateRangePicker({
  value,
  onChange,
  maxDate,
  minDate,
  className,
  ariaLabel = "Select a date range",
}: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);

  // Resync the in-progress selection whenever the popover is reopened.
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const handleSelect = (next: DateRange | undefined) => {
    setDraft(next);
    if (next?.from && next.to) {
      onChange(next);
      setOpen(false);
    }
  };

  const disabled: Matcher[] = [{ after: maxDate ?? new Date() }];
  if (minDate) disabled.push({ before: minDate });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={ariaLabel}
          className={cn("w-56 justify-start font-normal", className)}
        >
          <CalendarIcon />
          <span className="truncate">{formatDateRange(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          autoFocus
          defaultMonth={draft?.from}
          selected={draft}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
