import { parse, isValid, format } from "date-fns";

/**
 * Format user initials from name, surname, or email
 */
export function getInitials(
    name?: string | null,
    surname?: string | null,
    email?: string
): string {
    const firstInitial = name?.[0] || "";
    const lastInitial = surname?.[0] || "";
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();

    return initials || email?.[0]?.toUpperCase() || "?";
}

/**
 * Format role string to title case
 */
export function formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string | number | null | undefined): string {
    if (date === null || date === undefined || date === "") return "";

    let dateObj: Date;
    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === "number") {
        // Support unix timestamps (seconds or milliseconds)
        dateObj = new Date(date < 1e12 ? date * 1000 : date);
    } else if (typeof date === "string") {
        dateObj = new Date(date);
    } else {
        return "";
    }

    if (Number.isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0];
}

/**
 * Format date for display in DD/MM/YYYY format
 */
export function formatDateForDisplay(date: Date | string | number | null | undefined): string {
    const iso = formatDateForInput(date);
    if (!iso) return "";
    return iso.split("-").reverse().join("/");
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for database
 */
export function parseDateFromDisplay(displayDate: string | null): string {
    if (!displayDate) return "";
    const cleaned = displayDate.trim();
    if (!cleaned) return "";

    const parsed = parse(cleaned, 'dd/MM/yyyy', new Date());
    if (!isValid(parsed)) {
        throw new Error(`Invalid date: ${displayDate}. Use DD/MM/YYYY format.`);
    }
    return format(parsed, 'yyyy-MM-dd');
}

/**
 * Convert DD/MM/YYYY HH:mm to ISO for database
 */
export function parseDateTimeFromDisplay(displayDateTime: string | null): string {
    if (!displayDateTime) return "";
    const cleaned = displayDateTime.trim();
    if (!cleaned) return "";

    const parsed = parse(cleaned, 'dd/MM/yyyy HH:mm', new Date());
    if (!isValid(parsed)) {
        throw new Error(`Invalid date/time: ${displayDateTime}. Use DD/MM/YYYY HH:mm format.`);
    }
    return parsed.toISOString();
}

/**
 * Format date for display in DD/MM/YYYY HH:mm format
 */
export function formatDateTimeForDisplay(date: Date | string | number | null | undefined): string {
    if (date === null || date === undefined || date === "") return "";
    let dateObj: Date;
    if (date instanceof Date) {
        dateObj = date;
    } else if (typeof date === "number") {
        dateObj = new Date(date < 1e12 ? date * 1000 : date);
    } else {
        dateObj = new Date(date);
    }

    if (Number.isNaN(dateObj.getTime())) return "";

    const d = dateObj.getDate().toString().padStart(2, '0');
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    const h = dateObj.getHours().toString().padStart(2, '0');
    const min = dateObj.getMinutes().toString().padStart(2, '0');

    return `${d}/${m}/${y} ${h}:${min}`;
}

/**
 * Parse JSON string safely
 */
export function parseJSON<T>(jsonString: string | null): T | null {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        return null;
    }
}
