const pad = (value: number) => String(value).padStart(2, "0");

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toTimeInput = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function buildDefaultTripDateRange(options?: {
  startHour?: number;
  startMinute?: number;
  durationDays?: number;
  now?: Date;
}): DateRangeValue {
  const {
    startHour = 10,
    startMinute = 0,
    durationDays = 3,
    now = new Date(),
  } = options || {};

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + durationDays);

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
  };
}

export function parseTripDateTime(dateValue: string, timeValue: string) {
  const candidate = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}
