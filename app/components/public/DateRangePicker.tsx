import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface DateRangePickerProps {
  compact?: boolean;
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

const defaultDates = () => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 3);

  const toDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

export default function DateRangePicker({ compact = false, value, onChange }: DateRangePickerProps) {
  const initial = useMemo(() => defaultDates(), []);
  const [internal, setInternal] = useState<DateRangeValue>(initial);
  const model = value ?? internal;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(model);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => parseDate(model.startDate));

  useEffect(() => {
    setDraft(model);
  }, [model.startDate, model.endDate, model.startTime, model.endTime]);

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

  const isInRange = (d: Date) => d >= startDateObj && d <= endDateObj;
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const handleDaySelect = (d: Date) => {
    const dateValue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!isSelectingEnd || d < startDateObj) {
      setDraft((prev) => ({ ...prev, startDate: dateValue, endDate: dateValue }));
      setIsSelectingEnd(true);
      return;
    }

    setDraft((prev) => ({ ...prev, endDate: dateValue }));
    setIsSelectingEnd(false);
  };

  const monthOne = viewMonth;
  const monthTwo = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const inputClass = "w-full appearance-none rounded-xl border border-transparent p-0 leading-none text-sm text-gray-800 bg-transparent focus:outline-none";

  if (!compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Trip start</p>
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
          <p className="text-xs font-medium text-gray-500">Trip end</p>
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
    <div className="relative grid grid-cols-2 divide-x divide-gray-200 text-left">
      <button
        type="button"
        className="w-full space-y-1 pr-2 text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className="text-xs font-medium text-gray-500">Trip start</p>
        <div className="flex items-center whitespace-nowrap">
          <div className="relative min-w-[108px]">
            <input type="text" readOnly value={formatDisplay(model.startDate)} className={inputClass} />
          </div>
          <div className="relative min-w-[52px]">
            <input type="text" readOnly value={model.startTime} className={inputClass} />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </button>

      <button
        type="button"
        className="w-full space-y-1 pl-2 text-left border-0 bg-transparent appearance-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
        onClick={() => setOpen((prev) => !prev)}
      >
        <p className="text-xs font-medium text-gray-500">Trip end</p>
        <div className="flex items-center whitespace-nowrap">
          <div className="relative min-w-[108px]">
            <input type="text" readOnly value={formatDisplay(model.endDate)} className={inputClass} />
          </div>
          <div className="relative min-w-[52px]">
            <input type="text" readOnly value={model.endTime} className={inputClass} />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={cancelDraft} />
          <div className="absolute right-0 top-full mt-2 z-50 w-full sm:w-[39.875rem] max-w-[95vw] flex flex-col bg-white border border-transparent shadow-lg rounded-xl overflow-hidden md:right-auto md:left-[calc(-100%-0.75rem)]">
            <div className="sm:flex">
              {[monthOne, monthTwo].map((month, idx) => {
                const days = buildCalendar(month);
                const currentMonth = month.getMonth();

                return (
                  <div key={month.toISOString()} className="p-3 space-y-0.5 flex flex-col">
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

                      <div className="col-span-3 flex justify-center items-center gap-x-1 text-sm font-medium text-gray-800">
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
                        <span key={day} className="m-px block text-center text-sm text-gray-500">{day}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {days.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} className="m-px size-9 sm:size-10" />;
                        }

                        const disabled = day.getMonth() !== currentMonth;
                        const selectedStart = isSameDay(day, startDateObj);
                        const selectedEnd = isSameDay(day, endDateObj);
                        const inRange = isInRange(day);
                        return (
                          <div key={day.toISOString()} className={inRange ? "bg-violet-100/70" : ""}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => handleDaySelect(day)}
                              className={`m-px size-9 sm:size-10 flex justify-center items-center border-[1.5px] text-sm rounded-full disabled:opacity-50 disabled:pointer-events-none ${
                                selectedStart || selectedEnd
                                  ? "bg-violet-600 text-white border-transparent"
                                  : "border-transparent text-gray-800 hover:border-violet-700 hover:text-violet-700"
                              }`}
                            >
                              {day.getDate()}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-auto pt-3 flex justify-center items-center gap-x-2">
                      <input
                        type="time"
                        value={idx === 0 ? draft.startTime : draft.endTime}
                        onChange={(e) => update(idx === 0 ? { startTime: e.target.value } : { endTime: e.target.value })}
                        className="py-1 px-2 bg-transparent border border-gray-200 rounded-lg text-sm text-gray-800"
                      />
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
                <button type="button" onClick={applyDraft} className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-xs font-medium rounded-lg border border-transparent bg-violet-600 text-white hover:bg-violet-700">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
