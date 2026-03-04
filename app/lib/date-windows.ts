import { parseDateTimeFromDisplay } from "~/lib/formatters";

export type RelativeDayStatus = "upcoming" | "today" | "overdue";

export function getMonthWindow(year: number, month: number): { start: Date; end: Date } {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

export function getFutureWindow(daysAhead: number, now = new Date()): { start: Date; end: Date } {
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);
    return { start, end };
}

export function toIsoWindow(window: { start: Date; end: Date }): { startIso: string; endIso: string } {
    return {
        startIso: window.start.toISOString(),
        endIso: window.end.toISOString(),
    };
}

export function toDateFromUnknown(value: string | number | null | undefined): Date | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (Number.isFinite(n)) {
        const byNumber = new Date(n);
        if (!Number.isNaN(byNumber.getTime())) return byNumber;
    }
    const byString = new Date(String(value));
    return Number.isNaN(byString.getTime()) ? null : byString;
}

export function getRelativeDayStatus(target: Date, now = new Date()): RelativeDayStatus {
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays < 0) return "overdue";
    return "upcoming";
}

export function parseDisplayDateTimeToDate(displayDateTime: string): Date {
    const iso = parseDateTimeFromDisplay(displayDateTime);
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid date/time");
    }
    return parsed;
}
