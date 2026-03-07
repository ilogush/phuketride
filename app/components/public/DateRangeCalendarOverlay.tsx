import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import AuthSelect from "./AuthSelect";
import Button from "./Button";
import { buildCalendar, formatDisplay, monthLabel, timeOptions, weekDays } from "./date-range-picker.utils";
import type { DateRangeValue } from "./trip-date.model";

interface DateRangeCalendarOverlayProps {
  draft: DateRangeValue;
  startDateObj: Date;
  endDateObj: Date;
  monthOne: Date;
  monthTwo: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDaySelect: (date: Date) => void;
  onDraftChange: (patch: Partial<DateRangeValue>) => void;
  onCancel: () => void;
  onApply: () => void;
  isInRange: (date: Date) => boolean;
  isSameDay: (left: Date, right: Date) => boolean;
  isPastDay: (date: Date) => boolean;
  className: string;
  optionKeyPrefix: string;
}

export default function DateRangeCalendarOverlay({
  draft,
  startDateObj,
  endDateObj,
  monthOne,
  monthTwo,
  onPreviousMonth,
  onNextMonth,
  onDaySelect,
  onDraftChange,
  onCancel,
  onApply,
  isInRange,
  isSameDay,
  isPastDay,
  className,
  optionKeyPrefix,
}: DateRangeCalendarOverlayProps) {
  return (
    <div className={className}>
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
                      className="size-8 flex justify-center items-center text-gray-800 hover:bg-green-100 rounded-full"
                      onClick={onPreviousMonth}
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
                      className="size-8 flex justify-center items-center text-gray-800 hover:bg-green-100 rounded-full"
                      onClick={onNextMonth}
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
                  <span key={day} className="m-px block text-center text-sm sm:text-base text-gray-500">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${month.toISOString()}-${index}`} className="m-px h-10 sm:h-11" />;
                  }

                  const disabled = day.getMonth() !== currentMonth || isPastDay(day);
                  const selectedStart = isSameDay(day, startDateObj);
                  const selectedEnd = isSameDay(day, endDateObj);
                  const inRange = isInRange(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative flex justify-center ${inRange ? "bg-green-100/70" : ""} ${selectedStart ? "rounded-l-full" : ""} ${selectedEnd ? "rounded-r-full" : ""}`}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onDaySelect(day)}
                        className={`relative m-px size-10 sm:size-11 flex justify-center items-center border-[1.5px] text-base rounded-full disabled:pointer-events-none ${selectedStart || selectedEnd
                          ? "z-20 bg-green-600 text-white border-transparent"
                          : disabled
                            ? "z-10 border-transparent text-gray-500"
                            : "z-10 border-transparent text-gray-800 hover:border-green-700 hover:text-green-700"
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

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 py-3 px-4 border-t border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <input aria-label="Start date preview" type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.startDate)} />
            <AuthSelect
              value={draft.startTime}
              onChange={(event) => onDraftChange({ startTime: event.target.value })}
              inputClassName="rounded-lg px-2 py-2 text-sm text-gray-800 focus:border-green-600 focus:ring-green-600"
            >
              {timeOptions.map((time) => (
                <option key={`${optionKeyPrefix}-start-${time.value}`} value={time.value}>
                  {time.label}
                </option>
              ))}
            </AuthSelect>
          </div>
          <div className="flex items-center gap-1">
            <input aria-label="End date preview" type="text" readOnly className="p-2 block w-24 bg-gray-100 border-transparent rounded-lg text-sm text-gray-800" value={formatDisplay(draft.endDate)} />
            <AuthSelect
              value={draft.endTime}
              onChange={(event) => onDraftChange({ endTime: event.target.value })}
              inputClassName="rounded-lg px-2 py-2 text-sm text-gray-800 focus:border-green-600 focus:ring-green-600"
            >
              {timeOptions.map((time) => (
                <option key={`${optionKeyPrefix}-end-${time.value}`} value={time.value}>
                  {time.label}
                </option>
              ))}
            </AuthSelect>
          </div>
        </div>

        <div className="flex items-center md:justify-end gap-x-2">
          <Button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-green-100">
            Cancel
          </Button>
          <Button type="button" onClick={onApply} className="rounded-lg border border-transparent bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
