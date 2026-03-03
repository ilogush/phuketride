export function formatContactPhone(value: string | null | undefined): string {
    if (!value) return "-";
    const trimmed = value.trim();
    if (!trimmed) return "-";

    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return "-";

    return `+${digits}`;
}
