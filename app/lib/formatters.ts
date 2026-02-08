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
export function formatDateForInput(date: Date | string | null): string {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toISOString().split("T")[0];
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
