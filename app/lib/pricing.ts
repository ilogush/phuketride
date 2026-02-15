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
 * Calculate rental price for a specific date range
 */
export function calculateRentalPrice(
    basePrice: number,
    startDate: Date,
    endDate: Date,
    seasons: Season[],
    durations: RentalDuration[]
): PricingResult {
    // Calculate number of days
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get season for start date (could be enhanced to handle multi-season rentals)
    const season = getSeasonForDate(startDate, seasons);
    const seasonMultiplier = season?.priceMultiplier || 1.0;
    
    // Get duration multiplier
    const { multiplier: durationMultiplier, duration } = getDurationMultiplier(days, durations);
    
    // Calculate prices
    const { dailyPrice, totalPrice } = calculateSeasonalPrice(
        basePrice,
        seasonMultiplier,
        days,
        durationMultiplier
    );
    
    return {
        dailyPrice,
        totalPrice,
        seasonMultiplier,
        durationMultiplier,
        seasonName: season?.seasonName,
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
