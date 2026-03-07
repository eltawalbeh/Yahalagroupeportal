import React, { useState } from 'react';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from './utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange?: (range: DateRange) => void;
  className?: string;
}

export function DatePickerWithRange({ date, onDateChange, className }: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState(date);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (tempRange && newDate <= tempRange.to) {
      setTempRange({ ...tempRange, from: newDate });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (tempRange && newDate >= tempRange.from) {
      setTempRange({ ...tempRange, to: newDate });
    }
  };

  const handleApply = () => {
    if (tempRange && onDateChange) {
      onDateChange(tempRange);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempRange(date);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", className)}
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {formatDate(date.from)} - {formatDate(date.to)}
              </>
            ) : (
              formatDate(date.from)
            )
          ) : (
            "Pick a date range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">From Date</label>
            <input
              type="date"
              value={tempRange?.from.toISOString().split('T')[0] || ''}
              onChange={handleFromChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">To Date</label>
            <input
              type="date"
              value={tempRange?.to.toISOString().split('T')[0] || ''}
              onChange={handleToChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}