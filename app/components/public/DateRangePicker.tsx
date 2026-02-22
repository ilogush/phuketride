import { useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";

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
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const pad = (value: number) => String(value).padStart(2, "0");
const toDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const defaultDates = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 3);

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    startTime: "10:00",
    endTime: "10:00",
  };
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDisplay = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const monthLabel = (date: Date) => date.toLocaleString("en-US", { month: "long", year: "numeric" });

function buildCalendar(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = firstWeekday; i > 0; i -= 1) {
    cells.push(null);
  }

  for (let i = 1; i <= daysInMonth; i += 1) {
    cells.push(new Date(year, month, i));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
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
  compactLabelClassName = "text-xs font-medium text-gray-500",
  compactDateBorder = false,
  compactCalendarIconClassName = "h-4 w-4",
  compactShowChevron = false,
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

    const dateValue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const inputClass = "w-full appearance-none rounded-xl border border-transparent p-0 leading-none text-base text-gray-800 bg-transparent focus:outline-none";

  if (!compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Start date</p>
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
          <p className="text-xs font-medium text-gray-500">End date</p>
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

  return (
    <div className={`${dropdownFullWidth ? "static" : "relative"} grid grid-cols-2 text-left`}>
      <button
        type="button"
        className="w-full space-y-1 pr-2 text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className={compactLabelClassName}>{compactStartLabel}</p>
        <div className={`flex items-center whitespace-nowrap ${compactDateBorder ? "rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800" : ""}`}>
          <CalendarDaysIcon className={`${compactCalendarIconClassName} text-gray-500 mr-2 shrink-0`} />
          <div className={`relative min-w-[108px] ${compactShowChevron ? "pr-6" : ""}`}>
            <input type="text" readOnly value={formatDisplay(model.startDate)} className={inputClass} />
            {compactShowChevron ? (
              <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
            ) : null}
          </div>
        </div>
      </button>

      <button
        type="button"
        className="w-full space-y-1 pl-2 text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className={compactLabelClassName}>{compactEndLabel}</p>
        <div className={`flex items-center whitespace-nowrap ${compactDateBorder ? "rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-800" : ""}`}>
          <CalendarDaysIcon className={`${compactCalendarIconClassName} text-gray-500 mr-2 shrink-0`} />
          <div className={`relative min-w-[108px] ${compactShowChevron ? "pr-6" : ""}`}>
            <input type="text" readOnly value={formatDisplay(model.endDate)} className={inputClass} />
            {compactShowChevron ? (
              <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-700" />
            ) : null}
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={cancelDraft} />
          {(portalTargetId && portalTarget
            ? createPortal(
                <div
                  className={`absolute top-full mt-2 z-50 flex flex-col bg-white border border-transparent shadow-lg rounded-xl overflow-hidden ${
                    dropdownFullWidth
                      ? "!left-0 !right-0 w-auto max-w-none"
                      : "left-0 right-0 w-auto max-w-none"
                  }`}
                >
                  <div className="sm:flex sm:justify-center sm:gap-6 sm:px-6 md:px-8">
                    {[monthOne, monthTwo].map((month, idx) => {
                      const days = buildCalendar(month);
                      const currentMonth = month.getMonth();

                      return (
                        <div key={month.toISOString()} className="p-4 sm:p-5 space-y-1 flex flex-col flex-1 min-w-[18rem] sm:max-w-[22rem]">
                          <div className="grid grid-cols-5 items-center gap-x-3 mx-1.5 pb-3">
                            <div className="col-span-1">
                              {idx === 0 ? (
                                <button
                                  type="button"
                                  className="size-8 flex justify-center items-center text-gray-800 hover:bg-gray-100 rounded-full"
                                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                                >
                                  <ChevronLeftIcon className="size-4" />
                                </button>
                              ) : (
                                <div className="size-8" />
                              )}
                            </div>

                            <div className="col-span-3 flex justify-center items-center gap-x-1 text-base font-medium text-gray-800">
                              {monthLabel(month)}
                            </div>

                            <div className="col-span-1 flex justify-end">
                              {idx === 1 ? (
                                <button
                                  type="button"
                                  className="size-8 flex justify-center items-center text-gray-800 hover:bg-gray-100 rounded-full"
                                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                                >
                                  <ChevronRightIcon className="size-4" />
                                </button>
                              ) : (
                                <div className="size-8" />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-7 pb-1.5">
                            {weekDays.map((day) => (
                              <span key={day} className="m-px block text-center text-sm sm:text-base text-gray-500">{day}</span>
                            ))}
                          </div>

                          <div className="grid grid-cols-7">
                            {days.map((day, index) => {
                              if (!day) {
                                return <div key={`empty-${index}`} className="m-px h-10 sm:h-11" />;
                              }

                              const disabled = day.getMonth() !== currentMonth || isPastDay(day);
                              const selectedStart = isSameDay(day, startDateObj);
                              const selectedEnd = isSameDay(day, endDateObj);
                              const inRange = isInRange(day);
                              return (
                                <div key={day.toISOString()} className={`flex justify-center ${inRange ? "bg-indigo-100/70" : ""}`}>
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => handleDaySelect(day)}
                                    className={`m-px size-10 sm:size-11 flex justify-center items-center border-[1.5px] text-base rounded-full disabled:pointer-events-none ${
                                      selectedStart || selectedEnd
                                        ? "bg-indigo-600 text-white border-transparent"
                                        : disabled
                                          ? "border-transparent text-gray-500"
                                          : "border-transparent text-gray-800 hover:border-indigo-700 hover:text-indigo-700"
                                    }`}
                                  >
                                    {day.getDate()}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-3 px-4 border-t border-gray-200">
                    <div className="flex justify-center md:justify-start items-center gap-x-2">
                      <input type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.startDate)} />
                      <span className="text-gray-800">-</span>
                      <input type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.endDate)} />
                    </div>

                    <div className="flex items-center md:justify-end gap-x-2">
                      <button type="button" onClick={cancelDraft} className="py-2 px-3 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-800 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="button" onClick={applyDraft} className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-xs font-medium rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700">
                        Apply
                      </button>
                    </div>
                  </div>
                </div>,
                portalTarget
              )
            : (
              <div
                className={`absolute top-full mt-2 z-50 flex flex-col bg-white border border-transparent shadow-lg rounded-xl overflow-hidden ${
                  dropdownFullWidth
                    ? "!left-0 !right-0 w-auto max-w-none"
                    : "right-0 w-full sm:w-[46rem] max-w-[95vw]"
                }`}
              >
                <div className="sm:flex sm:justify-center sm:gap-6 sm:px-6 md:px-8">
                  {[monthOne, monthTwo].map((month, idx) => {
                    const days = buildCalendar(month);
                    const currentMonth = month.getMonth();

                    return (
                      <div key={month.toISOString()} className="p-4 sm:p-5 space-y-1 flex flex-col flex-1 min-w-[18rem] sm:max-w-[22rem]">
                        <div className="grid grid-cols-5 items-center gap-x-3 mx-1.5 pb-3">
                          <div className="col-span-1">
                            {idx === 0 ? (
                              <button
                                type="button"
                                className="size-8 flex justify-center items-center text-gray-800 hover:bg-gray-100 rounded-full"
                                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                              >
                                <ChevronLeftIcon className="size-4" />
                              </button>
                            ) : (
                              <div className="size-8" />
                            )}
                          </div>

                          <div className="col-span-3 flex justify-center items-center gap-x-1 text-base font-medium text-gray-800">
                            {monthLabel(month)}
                          </div>

                          <div className="col-span-1 flex justify-end">
                            {idx === 1 ? (
                              <button
                                type="button"
                                className="size-8 flex justify-center items-center text-gray-800 hover:bg-gray-100 rounded-full"
                                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                              >
                                <ChevronRightIcon className="size-4" />
                              </button>
                            ) : (
                              <div className="size-8" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-7 pb-1.5">
                          {weekDays.map((day) => (
                            <span key={day} className="m-px block text-center text-sm sm:text-base text-gray-500">{day}</span>
                          ))}
                        </div>

                        <div className="grid grid-cols-7">
                          {days.map((day, index) => {
                            if (!day) {
                              return <div key={`empty-${index}`} className="m-px size-10 sm:size-11" />;
                            }

                            const disabled = day.getMonth() !== currentMonth || isPastDay(day);
                            const selectedStart = isSameDay(day, startDateObj);
                            const selectedEnd = isSameDay(day, endDateObj);
                            const inRange = isInRange(day);
                            return (
                              <div key={day.toISOString()} className={inRange ? "bg-indigo-100/70" : ""}>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => handleDaySelect(day)}
                                  className={`m-px size-10 sm:size-11 flex justify-center items-center border-[1.5px] text-base rounded-full disabled:pointer-events-none ${
                                    selectedStart || selectedEnd
                                      ? "bg-indigo-600 text-white border-transparent"
                                      : disabled
                                        ? "border-transparent text-gray-500"
                                        : "border-transparent text-gray-800 hover:border-indigo-700 hover:text-indigo-700"
                                  }`}
                                >
                                  {day.getDate()}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-3 px-4 border-t border-gray-200">
                  <div className="flex justify-center md:justify-start items-center gap-x-2">
                    <input type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.startDate)} />
                    <span className="text-gray-800">-</span>
                    <input type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.endDate)} />
                  </div>

                  <div className="flex items-center md:justify-end gap-x-2">
                    <button type="button" onClick={cancelDraft} className="py-2 px-3 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-800 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="button" onClick={applyDraft} className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-xs font-medium rounded-lg border border-transparent bg-indigo-600 text-white hover:bg-indigo-700">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
