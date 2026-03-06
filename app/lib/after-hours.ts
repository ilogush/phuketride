type DaySchedule = {
  open?: boolean;
  startTime?: string;
  endTime?: string;
};

type WeeklyScheduleData = {
  sunday?: DaySchedule;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTimeMinutes = (value: string | undefined) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export function isNonWorkingDateTime({
  date,
  weeklyScheduleRaw,
  holidaysRaw,
}: {
  date: Date;
  weeklyScheduleRaw?: string | null;
  holidaysRaw?: string | null;
}) {
  if (Number.isNaN(date.getTime())) return false;

  const isoDate = toIsoDate(date);
  if (holidaysRaw) {
    try {
      const holidays = JSON.parse(holidaysRaw) as unknown;
      if (Array.isArray(holidays) && holidays.includes(isoDate)) {
        return true;
      }
    } catch {
      // ignore malformed holidays payload
    }
  }

  if (!weeklyScheduleRaw) return false;

  try {
    const parsed = JSON.parse(weeklyScheduleRaw) as WeeklyScheduleData;
    const dayKey = DAY_KEYS[date.getDay()];
    const daySchedule = parsed?.[dayKey];
    if (!daySchedule) return false;
    if (!daySchedule.open) return true;

    const startMinutes = parseTimeMinutes(daySchedule.startTime);
    const endMinutes = parseTimeMinutes(daySchedule.endTime);
    if (startMinutes === null || endMinutes === null) return false;

    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    return currentMinutes < startMinutes || currentMinutes > endMinutes;
  } catch {
    return false;
  }
}
