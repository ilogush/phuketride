import type { ReactNode } from "react";
import { isValidElement } from "react";
import { formatContactPhone } from "~/lib/phone";

export function getPropertyValue(item: unknown, key: string): unknown {
  if (!item || typeof item !== "object") {
    return undefined;
  }

  return (item as Record<string, unknown>)[key];
}

export function includesQuery(value: unknown, query: string): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((nestedValue) =>
      includesQuery(nestedValue, query),
    );
  }

  return String(value).toLowerCase().includes(query);
}

export function toReactNode(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return "";
  }

  if (isValidElement(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value as ReactNode;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return String(value);
}

export function formatCellValue(key: string, value: unknown): ReactNode {
  if (key === "id" && typeof value === "number") {
    return (
      <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
        {String(value).padStart(3, "0")}
      </span>
    );
  }

  if (key === "phone" || key === "whatsapp") {
    return formatContactPhone(typeof value === "string" ? value : null);
  }

  return value as ReactNode;
}
