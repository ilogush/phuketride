import { useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, ChevronDownIcon, ClockIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import DateRangeCalendarOverlay from "./DateRangeCalendarOverlay";
import {
  defaultDates,
  formatDisplay,
  formatTimeDisplay,
  parseDate,
  timeOptions,
  toDateInput,
} from "./date-range-picker.utils";

interface DateRangePickerProps {
  compact?: boolean;
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  dropdownFullWidth?: boolean;
  portalTargetId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  compactStartLabel?: string;
  compactEndLabel?: string;
  compactLabelClassName?: string;
  compactDateBorder?: boolean;
  compactCalendarIconClassName?: string;
  compactShowChevron?: boolean;
  compactShowTime?: boolean;
  compactVertical?: boolean;
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export default function DateRangePicker({
  compact = false,
  value,
  onChange,
  dropdownFullWidth = false,
  portalTargetId,
  isOpen,
  onOpenChange,
  compactStartLabel = "Start date",
  compactEndLabel = "End date",
  compactLabelClassName = "text-sm text-gray-500",
  compactDateBorder = false,
  compactCalendarIconClassName = "h-4 w-4",
  compactShowChevron = false,
  compactShowTime = false,
  compactVertical = false,
}: DateRangePickerProps) {
  const initial = useMemo(() => defaultDates(), []);
  const [internal, setInternal] = useState<DateRangeValue>(initial);
  const model = value ?? internal;

  const [internalOpen, setInternalOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(model);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => parseDate(model.startDate));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const open = isOpen ?? internalOpen;

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(open) : next;
    if (isOpen === undefined) {
      setInternalOpen(resolved);
    }
    onOpenChange?.(resolved);
  };

  useEffect(() => {
    setDraft(model);
  }, [model.startDate, model.endDate, model.startTime, model.endTime]);

  useEffect(() => {
    if (!portalTargetId || typeof document === "undefined") {
      setPortalTarget(null);
      return;
    }
    setPortalTarget(document.getElementById(portalTargetId));
  }, [portalTargetId]);

  const update = (patch: Partial<DateRangeValue>, applyNow = false) => {
    const next = { ...(applyNow ? model : draft), ...patch };
    if (applyNow) {
      if (!value) {
        setInternal(next);
      }
      onChange?.(next);
      return;
    }
    setDraft(next);
  };

  const applyDraft = () => {
    if (!value) {
      setInternal(draft);
    }
    onChange?.(draft);
    setOpen(false);
  };

  const cancelDraft = () => {
    setDraft(model);
    setOpen(false);
  };

  const startDateObj = parseDate(draft.startDate);
  const endDateObj = parseDate(draft.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minEndDateObj = new Date(startDateObj);
  minEndDateObj.setDate(minEndDateObj.getDate() + 1);

  const isInRange = (d: Date) => d >= startDateObj && d <= endDateObj;
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const isPastDay = (d: Date) => d < today;

  const handleDaySelect = (d: Date) => {
    if (isPastDay(d)) {
      return;
    }

    const dateValue = toDateInput(d);
    if (!isSelectingEnd || d <= startDateObj) {
      const nextEnd = new Date(d);
      nextEnd.setDate(nextEnd.getDate() + 1);
      setDraft((prev) => ({ ...prev, startDate: dateValue, endDate: toDateInput(nextEnd) }));
      setIsSelectingEnd(true);
      return;
    }

    if (d < minEndDateObj) {
      setDraft((prev) => ({ ...prev, endDate: toDateInput(minEndDateObj) }));
      setIsSelectingEnd(false);
      return;
    }

    setDraft((prev) => ({ ...prev, endDate: dateValue }));
    setIsSelectingEnd(false);
  };

  const monthOne = viewMonth;
  const monthTwo = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  const inputClass = "w-full appearance-none rounded-xl border border-transparent p-0 leading-none text-base text-gray-800 bg-transparent focus:outline-none";

  if (!compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Start date</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input type="date" value={model.startDate} onChange={(event) => update({ startDate: event.target.value }, true)} className={inputClass} />
            </div>
            <div className="relative">
              <input type="time" value={model.startTime} onChange={(event) => update({ startTime: event.target.value }, true)} className={inputClass} />
              <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">End date</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input type="date" value={model.endDate} onChange={(event) => update({ endDate: event.target.value }, true)} className={inputClass} />
            </div>
            <div className="relative">
              <input type="time" value={model.endTime} onChange={(event) => update({ endTime: event.target.value }, true)} className={inputClass} />
              <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startDisplayValue = formatDisplay(model.startDate);
  const endDisplayValue = formatDisplay(model.endDate);

  return (
    <div className={`${dropdownFullWidth ? "static" : "relative"} grid ${compactVertical ? "grid-cols-1 gap-2" : "grid-cols-2"} text-left`}>
      <button
        type="button"
        className={`w-full space-y-1 ${compactVertical ? "" : "pr-2"} text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className={compactLabelClassName}>{compactStartLabel}</p>
        <div className={`flex items-center gap-2${compactDateBorder ? " rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800" : ""}`}>
          <CalendarDaysIcon className={`${compactCalendarIconClassName} text-gray-500 flex-shrink-0`} />
          <span className="text-base text-gray-800 whitespace-nowrap">{startDisplayValue}</span>
          {compactShowTime ? (
            <>
              <ClockIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-base  text-gray-700 whitespace-nowrap">{formatTimeDisplay(model.startTime)}</span>
            </>
          ) : null}
          {compactShowChevron ? (
            <ChevronDownIcon className="pointer-events-none h-5 w-5 text-gray-700 ml-auto" />
          ) : null}
        </div>
      </button>

      <button
        type="button"
        className={`w-full space-y-1 ${compactVertical ? "" : "pl-2"} text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className={compactLabelClassName}>{compactEndLabel}</p>
        <div className={`flex items-center gap-2${compactDateBorder ? " rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800" : ""}`}>
          <CalendarDaysIcon className={`${compactCalendarIconClassName} text-gray-500 flex-shrink-0`} />
          <span className="text-base text-gray-800 whitespace-nowrap">{endDisplayValue}</span>
          {compactShowTime ? (
            <>
              <ClockIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-base  text-gray-700 whitespace-nowrap">{formatTimeDisplay(model.endTime)}</span>
            </>
          ) : null}
          {compactShowChevron ? (
            <ChevronDownIcon className="pointer-events-none h-5 w-5 text-gray-700 ml-auto" />
          ) : null}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={cancelDraft} />
          {(portalTargetId && portalTarget
            ? createPortal(
              <DateRangeCalendarOverlay
                draft={draft}
                startDateObj={startDateObj}
                endDateObj={endDateObj}
                monthOne={monthOne}
                monthTwo={monthTwo}
                onPreviousMonth={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                onNextMonth={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                onDaySelect={handleDaySelect}
                onDraftChange={update}
                onCancel={cancelDraft}
                onApply={applyDraft}
                isInRange={isInRange}
                isSameDay={isSameDay}
                isPastDay={isPastDay}
                optionKeyPrefix="draft"
                className={`absolute top-full mt-2 z-50 flex flex-col bg-white border border-transparent shadow-lg rounded-xl overflow-hidden ${dropdownFullWidth
                  ? "!left-0 !right-0 w-auto max-w-none"
                  : "left-0 right-0 w-auto max-w-none"
                  }`}
              />,
              portalTarget
            )
            : (
              <DateRangeCalendarOverlay
                draft={draft}
                startDateObj={startDateObj}
                endDateObj={endDateObj}
                monthOne={monthOne}
                monthTwo={monthTwo}
                onPreviousMonth={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                onNextMonth={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                onDaySelect={handleDaySelect}
                onDraftChange={update}
                onCancel={cancelDraft}
                onApply={applyDraft}
                isInRange={isInRange}
                isSameDay={isSameDay}
                isPastDay={isPastDay}
                optionKeyPrefix="draft2"
                className={`absolute top-full mt-2 z-50 flex flex-col bg-white border border-transparent shadow-lg rounded-xl overflow-hidden ${dropdownFullWidth
                  ? "!left-0 !right-0 w-auto max-w-none"
                  : "right-0 w-full sm:w-[46rem] max-w-[95vw]"
                  }`}
              />
            ))}
        </>
      )}
    </div>
  );
}
