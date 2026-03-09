// D1Database is a global type provided by the Cloudflare Workers runtime (worker-configuration.d.ts)

/**
 * Checks if a car is available for a given date range.
 * Returns the conflicting entity (contract or booking) if found, or null.
 */
export async function checkCarAvailability(
  db: D1Database,
  companyCarId: number,
  startDate: string | Date,
  endDate: string | Date,
  excludeContractId?: number,
  excludeBookingId?: number
): Promise<{ type: "contract" | "booking"; id: number } | null> {
  const startStr = typeof startDate === "string" ? startDate : startDate.toISOString();
  const endStr = typeof endDate === "string" ? endDate : endDate.toISOString();

  // 1. Check contracts
  const contractConflict = await db
    .prepare(`
      SELECT id
      FROM contracts
      WHERE company_car_id = ? AND status IN ('active', 'pending')
        AND (
          (start_date < ? AND end_date > ?)
        )
        ${excludeContractId ? "AND id != ?" : ""}
      LIMIT 1
    `)
    .bind(...[companyCarId, endStr, startStr, ...(excludeContractId ? [excludeContractId] : [])])
    .first() as { id: number } | null;

  if (contractConflict) {
    return { type: "contract", id: contractConflict.id };
  }

  // 2. Check bookings
  const bookingConflict = await db
    .prepare(`
      SELECT id
      FROM bookings
      WHERE company_car_id = ? AND status IN ('pending', 'confirmed')
        AND (
          (start_date < ? AND end_date > ?)
        )
        ${excludeBookingId ? "AND id != ?" : ""}
      LIMIT 1
    `)
    .bind(...[companyCarId, endStr, startStr, ...(excludeBookingId ? [excludeBookingId] : [])])
    .first() as { id: number } | null;

  if (bookingConflict) {
    return { type: "booking", id: bookingConflict.id };
  }

  return null;
}

/**
 * Validates if the car status allows new actions.
 */
export async function validateCarStatus(
  db: D1Database,
  companyCarId: number,
  allowedStatuses: string[] = ["available"]
): Promise<boolean> {
  const car = await db
    .prepare("SELECT status FROM company_cars WHERE id = ? LIMIT 1")
    .bind(companyCarId)
    .first() as { status: string } | null;

  return !!car && allowedStatuses.includes(car.status);
}
