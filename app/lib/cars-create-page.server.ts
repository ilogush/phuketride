import {
    getCachedCarTemplateOptions,
    getCachedColors,
    getCachedRentalDurations,
    getCachedSeasons,
} from "~/lib/dictionaries-cache.server";
import type { CarTemplateOption, SimpleOptionRow } from "~/lib/cars-create-types";
import type { CachedDurationRow, CachedSeasonRow } from "~/lib/dictionaries-cache.server";

export async function loadCreateCarPageData(db: D1Database): Promise<{
    templates: CarTemplateOption[];
    colors: SimpleOptionRow[];
    seasons: CachedSeasonRow[];
    durations: CachedDurationRow[];
}> {
    const [templates, colors, seasons, durations] = await Promise.all([
        getCachedCarTemplateOptions(db) as Promise<CarTemplateOption[]>,
        getCachedColors(db) as Promise<SimpleOptionRow[]>,
        getCachedSeasons(db),
        getCachedRentalDurations(db),
    ]);

    return {
        templates,
        colors,
        seasons,
        durations,
    };
}
