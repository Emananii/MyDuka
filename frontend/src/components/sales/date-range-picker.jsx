// src/components/sales/date-range-picker.jsx
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
//import { DateRange } from "react-day-picker"; // Import DateRange type

import { cn } from "@/lib/utils"; // Your utility for conditional classnames
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * DateRangePicker Component
 * Allows users to select a date range using a calendar popover.
 *
 * @param {object} props
 * @param {DateRange} props.date - The current selected date range {from: Date, to: Date}.
 * @param {function(DateRange | undefined): void} props.onSelect - Callback when a new date range is selected.
 * @param {string} [props.className] - Optional CSS classes for the container.
 */
export function DateRangePicker({ date, onSelect, className }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onSelect}
            numberOfMonths={2} // Shows two months side-by-side
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}