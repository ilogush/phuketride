import { data } from "react-router";
import { redirectWithError } from "~/lib/route-feedback";
import { parseFormIntent, runMutationWithFeedback } from "~/lib/admin-actions";

type SeasonsActionArgs = {
  db: D1Database;
  formData: FormData;
};

type SeasonCoverageRow = {
  id?: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

function getDayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let i = 0; i < month - 1; i++) {
    dayOfYear += daysInMonth[i];
  }
  return dayOfYear;
}

function isValidDate(month: number, day: number): boolean {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function getSeasonDays(startMonth: number, startDay: number, endMonth: number, endDay: number): Set<number> {
  const days = new Set<number>();
  const startDayOfYear = getDayOfYear(startMonth, startDay);
  const endDayOfYear = getDayOfYear(endMonth, endDay);

  if (startDayOfYear <= endDayOfYear) {
    for (let i = startDayOfYear; i <= endDayOfYear; i++) {
      days.add(i);
    }
  } else {
    for (let i = startDayOfYear; i <= 366; i++) {
      days.add(i);
    }
    for (let i = 1; i <= endDayOfYear; i++) {
      days.add(i);
    }
  }

  return days;
}

function validateSeasonsCoverage(seasons: Array<{ startMonth: number; startDay: number; endMonth: number; endDay: number }>): { valid: boolean; message?: string } {
  for (let i = 0; i < seasons.length; i++) {
    const season1Days = getSeasonDays(seasons[i].startMonth, seasons[i].startDay, seasons[i].endMonth, seasons[i].endDay);

    for (let j = i + 1; j < seasons.length; j++) {
      const season2Days = getSeasonDays(seasons[j].startMonth, seasons[j].startDay, seasons[j].endMonth, seasons[j].endDay);
      for (const day of season1Days) {
        if (season2Days.has(day)) {
          return { valid: false, message: "Seasons overlap detected. Each day must belong to only one season" };
        }
      }
    }
  }

  const allCoveredDays = new Set<number>();
  for (const season of seasons) {
    const seasonDays = getSeasonDays(season.startMonth, season.startDay, season.endMonth, season.endDay);
    seasonDays.forEach((day) => allCoveredDays.add(day));
  }

  if (allCoveredDays.size < 365) {
    return { valid: false, message: "All days of the year must be covered by seasons. Found gaps in coverage" };
  }

  return { valid: true };
}

export async function handleSeasonsAction({ request, db, formData }: SeasonsActionArgs & { request: Request }) {
  const intentParsed = parseFormIntent(formData, ["delete", "create", "update", "seed"], "Invalid action");
  if (!intentParsed.ok) {
    return data({ success: false, message: "Invalid action" }, { status: 400 });
  }

  const intent = intentParsed.data.intent;

  if (intent === "delete") {
    const id = Number(formData.get("id"));

    const allSeasonsResult = await db
      .prepare(`
        SELECT id, start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay
        FROM seasons
      `)
      .all() as { results?: SeasonCoverageRow[] };
    const allSeasons = allSeasonsResult.results || [];
    const remainingSeasons = allSeasons.filter((season) => season.id !== id);

    if (remainingSeasons.length > 0) {
      const validation = validateSeasonsCoverage(remainingSeasons);
      if (!validation.valid) {
        return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
      }
    }

    return runMutationWithFeedback(request,
      async () => {
        await db
          .prepare("DELETE FROM seasons WHERE id = ?")
          .bind(id)
          .run();
      },
      {
        successPath: "/seasons",
        successMessage: "Season deleted successfully",
        errorMessage: "Failed to delete season",
      }
    );
  }

  if (intent === "create") {
    const seasonName = formData.get("seasonName") as string;
    const startMonth = Number(formData.get("startMonth"));
    const startDay = Number(formData.get("startDay"));
    const endMonth = Number(formData.get("endMonth"));
    const endDay = Number(formData.get("endDay"));
    const priceMultiplier = Number(formData.get("priceMultiplier"));
    const discountLabel = formData.get("discountLabel") as string | null;

    if (!isValidDate(startMonth, startDay)) {
      return redirectWithError("/seasons", "Invalid start date");
    }
    if (!isValidDate(endMonth, endDay)) {
      return redirectWithError("/seasons", "Invalid end date");
    }

    const existingSeasonsResult = await db
      .prepare("SELECT start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay FROM seasons")
      .all() as { results?: SeasonCoverageRow[] };
    const existingSeasons = existingSeasonsResult.results || [];

    const allSeasons = [...existingSeasons, { startMonth, startDay, endMonth, endDay }];
    const validation = validateSeasonsCoverage(allSeasons);
    if (!validation.valid) {
      return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
    }

    return runMutationWithFeedback(request,
      async () => {
        await db
          .prepare(`
            INSERT INTO seasons (
              season_name, start_month, start_day, end_month, end_day,
              price_multiplier, discount_label, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            seasonName,
            startMonth,
            startDay,
            endMonth,
            endDay,
            priceMultiplier,
            discountLabel || null,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
      },
      {
        successPath: "/seasons",
        successMessage: "Season created successfully",
        errorMessage: "Failed to create season",
      }
    );
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const seasonName = formData.get("seasonName") as string;
    const startMonth = Number(formData.get("startMonth"));
    const startDay = Number(formData.get("startDay"));
    const endMonth = Number(formData.get("endMonth"));
    const endDay = Number(formData.get("endDay"));
    const priceMultiplier = Number(formData.get("priceMultiplier"));
    const discountLabel = formData.get("discountLabel") as string | null;

    if (!isValidDate(startMonth, startDay)) {
      return redirectWithError("/seasons", "Invalid start date");
    }
    if (!isValidDate(endMonth, endDay)) {
      return redirectWithError("/seasons", "Invalid end date");
    }

    const existingSeasonsResult = await db
      .prepare(`
        SELECT id, start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay
        FROM seasons
      `)
      .all() as { results?: SeasonCoverageRow[] };
    const existingSeasons = existingSeasonsResult.results || [];
    const otherSeasons = existingSeasons.filter((season) => season.id !== id);

    const allSeasons = [...otherSeasons, { startMonth, startDay, endMonth, endDay }];
    const validation = validateSeasonsCoverage(allSeasons);
    if (!validation.valid) {
      return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
    }

    return runMutationWithFeedback(request,
      async () => {
        await db
          .prepare(`
            UPDATE seasons
            SET season_name = ?, start_month = ?, start_day = ?, end_month = ?, end_day = ?,
                price_multiplier = ?, discount_label = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(
            seasonName,
            startMonth,
            startDay,
            endMonth,
            endDay,
            priceMultiplier,
            discountLabel || null,
            new Date().toISOString(),
            id
          )
          .run();
      },
      {
        successPath: "/seasons",
        successMessage: "Season updated successfully",
        errorMessage: "Failed to update season",
      }
    );
  }

  if (intent === "seed") {
    const defaultSeasons = [
      { seasonName: "Peak Season", startMonth: 12, startDay: 20, endMonth: 1, endDay: 20, priceMultiplier: 1.5, discountLabel: "+50%" },
      { seasonName: "High Season", startMonth: 1, startDay: 21, endMonth: 5, endDay: 5, priceMultiplier: 1.3, discountLabel: "+30%" },
      { seasonName: "Low Season", startMonth: 5, startDay: 6, endMonth: 10, endDay: 20, priceMultiplier: 1, discountLabel: "Base" },
      { seasonName: "Shoulder Season", startMonth: 10, startDay: 21, endMonth: 12, endDay: 19, priceMultiplier: 1.1, discountLabel: "+10%" },
    ];

    return runMutationWithFeedback(request,
      async () => {
        const batch: any[] = [];
        const now = new Date().toISOString();
        for (const season of defaultSeasons) {
          batch.push(db
            .prepare(`
              INSERT INTO seasons (
                season_name, start_month, start_day, end_month, end_day,
                price_multiplier, discount_label, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              season.seasonName,
              season.startMonth,
              season.startDay,
              season.endMonth,
              season.endDay,
              season.priceMultiplier,
              season.discountLabel,
              now,
              now
            ));
        }
        await db.batch(batch);
      },
      {
        successPath: "/seasons",
        successMessage: "Default seasons created successfully",
        errorMessage: "Failed to create default seasons",
      }
    );
  }

  return data({ success: false, message: "Invalid action" }, { status: 400 });
}
