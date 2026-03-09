/**
 * Pricing calculation utilities for rental cars
 * Handles seasonal pricing and duration-based discounts
 */

export interface Season {
    id: number;
    seasonName: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface RentalDuration {
    id: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

export interface PricingResult {
    dailyPrice: number;
    totalPrice: number;
    seasonMultiplier: number;
    durationMultiplier: number;
    seasonName?: string;
    durationName?: string;
}

export interface HostIncomeEstimate {
    dailyRate: number;
    monthlyEarnings: number;
    annualEarnings: number;
}

/**
 * Calculate seasonal price based on base price, season multiplier, days, and duration multiplier
 * Duration multiplier affects BOTH daily price and total price (discount for longer rentals)
 */
export function calculateSeasonalPrice(
    basePrice: number,
    seasonMultiplier: number,
    days: number,
    durationMultiplier: number
): { dailyPrice: number; totalPrice: number } {
    // Apply both season and duration multipliers to daily price
    const dailyPrice = basePrice * seasonMultiplier * durationMultiplier;
    const totalPrice = dailyPrice * days;
    return { dailyPrice, totalPrice };
}

/**
 * Calculate number of rental days between two dates with a lower bound.
 */
export function calculateRentalDays(
    startDate: Date,
    endDate: Date,
    minDays: number = 1
): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    const rawDays = Number.isFinite(diffMs) ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : minDays;
    return Math.max(minDays, rawDays);
}

/**
 * Calculate base rental totals without seasonal/duration modifiers.
 */
export function calculateBaseTripTotal(
    pricePerDay: number,
    startDate: Date,
    endDate: Date
): { days: number; total: number } {
    const days = calculateRentalDays(startDate, endDate, 1);
    const safeDaily = Number.isFinite(pricePerDay) ? Math.max(0, pricePerDay) : 0;
    return { days, total: days * safeDaily };
}

/**
 * Estimate host income used by public and admin calculators.
 */
export function calculateHostIncomeEstimate(
    carValue: number,
    rentedDaysPerMonth: number,
    rateFactor: number = 0.002
): HostIncomeEstimate {
    const safeCarValue = Number.isFinite(carValue) ? Math.max(0, carValue) : 0;
    const safeDays = Number.isFinite(rentedDaysPerMonth) ? Math.max(0, rentedDaysPerMonth) : 0;
    const safeFactor = Number.isFinite(rateFactor) ? Math.max(0, rateFactor) : 0;

    const dailyRate = Math.round(safeCarValue * safeFactor);
    const monthlyEarnings = dailyRate * safeDays;
    const annualEarnings = monthlyEarnings * 12;

    return { dailyRate, monthlyEarnings, annualEarnings };
}

/**
 * Get the appropriate duration multiplier for a given number of days
 */
export function getDurationMultiplier(days: number, durations: RentalDuration[]): {
    multiplier: number;
    duration: RentalDuration | null;
} {
    // Sort durations by minDays to ensure correct matching
    const sortedDurations = [...durations].sort((a, b) => a.minDays - b.minDays);
    
    for (const duration of sortedDurations) {
        if (duration.maxDays === null) {
            // Unlimited duration (e.g., 29+ days)
            if (days >= duration.minDays) {
                return { multiplier: duration.priceMultiplier, duration };
            }
        } else {
            // Fixed range duration (e.g., 1-3 days, 4-7 days)
            if (days >= duration.minDays && days <= duration.maxDays) {
                return { multiplier: duration.priceMultiplier, duration };
            }
        }
    }
    
    // Default to 1.0 if no duration matches
    return { multiplier: 1.0, duration: null };
}

/**
 * Get the appropriate season for a given date
 */
export function getSeasonForDate(date: Date, seasons: Season[]): Season | null {
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate(); // 1-31
    
    for (const season of seasons) {
        if (isDateInSeason(month, day, season)) {
            return season;
        }
    }
    
    return null;
}

/**
 * Check if a date (month/day) falls within a season
 */
function isDateInSeason(month: number, day: number, season: Season): boolean {
    const currentDayOfYear = getDayOfYear(month, day);
    const seasonStartDay = getDayOfYear(season.startMonth, season.startDay);
    const seasonEndDay = getDayOfYear(season.endMonth, season.endDay);
    
    if (seasonStartDay <= seasonEndDay) {
        // Normal range within same year (e.g., May 6 - Oct 20)
        return currentDayOfYear >= seasonStartDay && currentDayOfYear <= seasonEndDay;
    } else {
        // Wraps around year end (e.g., Dec 20 - Jan 20)
        return currentDayOfYear >= seasonStartDay || currentDayOfYear <= seasonEndDay;
    }
}

/**
 * Convert month/day to day of year (1-366)
 */
function getDayOfYear(month: number, day: number): number {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = day;
    for (let i = 0; i < month - 1; i++) {
        dayOfYear += daysInMonth[i];
    }
    return dayOfYear;
}

/**
 * Calculate rental price for a specific date range.
 * Handles multi-season rentals by splitting the period into season segments
 * and summing the weighted cost for each segment.
 */
export function calculateRentalPrice(
    basePrice: number,
    startDate: Date,
    endDate: Date,
    seasons: Season[],
    durations: RentalDuration[]
): PricingResult {
    // #21 fix: use shared calculateRentalDays (respects minDays=1)
    const totalDays = calculateRentalDays(startDate, endDate, 1);

    // #8 fix: build a list of daily entries to determine per-season breakdown
    const dailySeasons: Array<{ day: Date; season: Season | null }> = [];
    for (let i = 0; i < totalDays; i++) {
        const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        dailySeasons.push({ day, season: getSeasonForDate(day, seasons) });
    }

    // Get duration multiplier based on total days
    const { multiplier: durationMultiplier, duration } = getDurationMultiplier(totalDays, durations);

    // Sum price day by day (each day gets its own season multiplier)
    let totalPrice = 0;
    for (const { season } of dailySeasons) {
        const seasonMultiplier = season?.priceMultiplier ?? 1.0;
        const dailyPrice = basePrice * seasonMultiplier * durationMultiplier;
        totalPrice += dailyPrice;
    }

    // Representative daily price (weighted average across all days)
    const dailyPrice = totalDays > 0 ? totalPrice / totalDays : basePrice * durationMultiplier;

    // For metadata: use the season of the start date as "primary" season
    const primarySeason = getSeasonForDate(startDate, seasons);

    return {
        dailyPrice: Math.round(dailyPrice * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        seasonMultiplier: primarySeason?.priceMultiplier ?? 1.0,
        durationMultiplier,
        seasonName: primarySeason?.seasonName,
        durationName: duration?.rangeName,
    };
}


/**
 * Calculate average days for a duration range (used for pricing matrix display)
 */
export function getAverageDays(duration: RentalDuration): number {
    if (duration.maxDays === null) {
        // For unlimited duration (e.g., 29+ days), use minDays + 2
        return duration.minDays + 2;
    }
    // For fixed range, use average
    return Math.ceil((duration.minDays + duration.maxDays) / 2);
}
