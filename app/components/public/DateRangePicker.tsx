import { useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

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

  const toDateInput = (date: Date) => {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    startTime: "10:00",
    endTime: "10:00",
  };
};

export default function DateRangePicker({ compact = false, value, onChange }: DateRangePickerProps) {
  const initial = useMemo(() => defaultDates(), []);
  const [internal, setInternal] = useState<DateRangeValue>(initial);
  const model = value ?? internal;

  const update = (patch: Partial<DateRangeValue>) => {
    const next = { ...model, ...patch };
    if (!value) {
      setInternal(next);
    }
    onChange?.(next);
  };

  const inputClass = compact
    ? "w-full appearance-none rounded-xl border border-transparent px-3 py-2 text-sm text-gray-800 bg-transparent focus:outline-none"
    : "w-full rounded-2xl border border-gray-200 px-4 py-3 text-base text-gray-800 bg-white";

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Trip start</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="date"
              value={model.startDate}
              onChange={(event) => update({ startDate: event.target.value })}
              className={inputClass}
            />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <input
              type="time"
              value={model.startTime}
              onChange={(event) => update({ startTime: event.target.value })}
              className={inputClass}
            />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">Trip end</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="date"
              value={model.endDate}
              onChange={(event) => update({ endDate: event.target.value })}
              className={inputClass}
            />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <input
              type="time"
              value={model.endTime}
              onChange={(event) => update({ endTime: event.target.value })}
              className={inputClass}
            />
            <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
