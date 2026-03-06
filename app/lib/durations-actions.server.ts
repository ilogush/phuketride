import { data } from "react-router";
import { redirectWithError } from "~/lib/route-feedback";
import { parseFormIntent, runMutationWithFeedback } from "~/lib/admin-actions";

type DurationRangeRow = {
  id: number;
  minDays: number;
  maxDays: number | null;
};

function validateDurationsCoverage(durations: Array<{ minDays: number; maxDays: number | null }>): { valid: boolean; message?: string } {
  if (durations.length === 0) {
    return { valid: true };
  }

  const sorted = [...durations].sort((a, b) => a.minDays - b.minDays);

  if (sorted[0].minDays !== 1) {
    return { valid: false, message: "First duration must start at day 1" };
  }

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.minDays < 1) {
      return { valid: false, message: "Min days must be at least 1" };
    }
    if (current.maxDays !== null && current.maxDays < current.minDays) {
      return { valid: false, message: "Max days must be greater than or equal to min days" };
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (current.maxDays === null) {
        return { valid: false, message: "Only the last duration can have unlimited max days" };
      }
      if (next.minDays !== current.maxDays + 1) {
        return { valid: false, message: `Gap detected: duration ends at day ${current.maxDays} but next starts at day ${next.minDays}` };
      }
    }
  }

  const last = sorted[sorted.length - 1];
  if (last.maxDays !== null) {
    return { valid: false, message: "Last duration should have unlimited max days (0 or empty)" };
  }

  return { valid: true };
}

export async function handleDurationsAction({
  db,
  formData,
}: {
  db: D1Database;
  formData: FormData;
}) {
  const intentParsed = parseFormIntent(formData, ["delete", "create", "update", "seed"], "Invalid action");
  if (!intentParsed.ok) {
    return data({ success: false, message: "Invalid action" }, { status: 400 });
  }
  const intent = intentParsed.data.intent;

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    const allDurationsResult = (await db
      .prepare("SELECT id, min_days AS minDays, max_days AS maxDays FROM rental_durations")
      .all()) as { results?: DurationRangeRow[] };
    const allDurations = allDurationsResult.results || [];
    const remainingDurations = allDurations.filter((d) => d.id !== id);

    if (remainingDurations.length > 0) {
      const validation = validateDurationsCoverage(remainingDurations);
      if (!validation.valid) {
        return redirectWithError("/durations", validation.message || "Invalid durations coverage");
      }
    }

    return runMutationWithFeedback(
      async () => {
        await db.prepare("DELETE FROM rental_durations WHERE id = ?").bind(id).run();
      },
      {
        successPath: "/durations",
        successMessage: "Duration deleted successfully",
        errorMessage: "Failed to delete duration",
      }
    );
  }

  if (intent === "create") {
    const rangeName = formData.get("rangeName") as string;
    const minDays = Number(formData.get("minDays"));
    const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
    const priceMultiplier = Number(formData.get("priceMultiplier"));
    const discountLabel = formData.get("discountLabel") as string | null;
    const normalizedMaxDays = maxDays === 0 ? null : maxDays;

    const existingDurationsResult = (await db
      .prepare("SELECT min_days AS minDays, max_days AS maxDays FROM rental_durations")
      .all()) as { results?: Array<{ minDays: number; maxDays: number | null }> };
    const existingDurations = existingDurationsResult.results || [];
    const allDurations = [...existingDurations, { minDays, maxDays: normalizedMaxDays }];
    const validation = validateDurationsCoverage(allDurations);
    if (!validation.valid) {
      return redirectWithError("/durations", validation.message || "Invalid durations coverage");
    }

    return runMutationWithFeedback(
      async () => {
        await db
          .prepare(`
            INSERT INTO rental_durations (
              range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            rangeName,
            minDays,
            normalizedMaxDays,
            priceMultiplier,
            discountLabel || null,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
      },
      {
        successPath: "/durations",
        successMessage: "Duration created successfully",
        errorMessage: "Failed to create duration",
      }
    );
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const rangeName = formData.get("rangeName") as string;
    const minDays = Number(formData.get("minDays"));
    const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
    const priceMultiplier = Number(formData.get("priceMultiplier"));
    const discountLabel = formData.get("discountLabel") as string | null;
    const normalizedMaxDays = maxDays === 0 ? null : maxDays;

    const allDurationsResult = (await db
      .prepare("SELECT id, min_days AS minDays, max_days AS maxDays FROM rental_durations")
      .all()) as { results?: DurationRangeRow[] };
    const allDurations = allDurationsResult.results || [];
    const otherDurations = allDurations.filter((d) => d.id !== id);
    const durationsToValidate = [...otherDurations, { minDays, maxDays: normalizedMaxDays }];
    const validation = validateDurationsCoverage(durationsToValidate);
    if (!validation.valid) {
      return redirectWithError("/durations", validation.message || "Invalid durations coverage");
    }

    return runMutationWithFeedback(
      async () => {
        await db
          .prepare(`
            UPDATE rental_durations
            SET range_name = ?, min_days = ?, max_days = ?, price_multiplier = ?,
                discount_label = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(
            rangeName,
            minDays,
            normalizedMaxDays,
            priceMultiplier,
            discountLabel || null,
            new Date().toISOString(),
            id
          )
          .run();
      },
      {
        successPath: "/durations",
        successMessage: "Duration updated successfully",
        errorMessage: "Failed to update duration",
      }
    );
  }

  if (intent === "seed") {
    const defaultDurations = [
      { rangeName: "1-2 days", minDays: 1, maxDays: 2, priceMultiplier: 1, discountLabel: null },
      { rangeName: "3-6 days", minDays: 3, maxDays: 6, priceMultiplier: 0.95, discountLabel: "5% off" },
      { rangeName: "7-13 days", minDays: 7, maxDays: 13, priceMultiplier: 0.9, discountLabel: "10% off" },
      { rangeName: "14-20 days", minDays: 14, maxDays: 20, priceMultiplier: 0.85, discountLabel: "15% off" },
      { rangeName: "21-28 days", minDays: 21, maxDays: 28, priceMultiplier: 0.8, discountLabel: "20% off" },
      { rangeName: "29+ days", minDays: 29, maxDays: null, priceMultiplier: 0.75, discountLabel: "25% off" },
    ];

    return runMutationWithFeedback(
      async () => {
        for (const duration of defaultDurations) {
          await db
            .prepare(`
              INSERT INTO rental_durations (
                range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              duration.rangeName,
              duration.minDays,
              duration.maxDays,
              duration.priceMultiplier,
              duration.discountLabel,
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run();
        }
      },
      {
        successPath: "/durations",
        successMessage: "Default durations created successfully",
        errorMessage: "Failed to create default durations",
      }
    );
  }

  return data({ success: false, message: "Invalid action" }, { status: 400 });
}
