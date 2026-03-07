import type { DateRangeValue } from "./DateRangePicker";

const pad = (value: number) => String(value).padStart(2, "0");

export const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const defaultDates = (): DateRangeValue => {
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

export const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatDisplay = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export const formatTimeDisplay = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(2026, 0, 1, hour || 0, minute || 0, 0, 0);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
};

export const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;
  const value = `${pad(hour)}:${pad(minute)}`;
  const date = new Date(2026, 0, 1, hour, minute, 0, 0);
  return { value, label: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) };
});

export const monthLabel = (date: Date) => date.toLocaleString("en-US", { month: "long", year: "numeric" });

export function buildCalendar(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let index = firstWeekday; index > 0; index -= 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
