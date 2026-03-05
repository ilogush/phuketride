import { recalcCarRatingMetrics } from "~/lib/car-reviews.server";

type EnsureInput = {
  db: D1Database;
  carId: number;
  carTitle: string;
  requestUrl: string;
};

export async function ensureCarDemoContent(input: EnsureInput): Promise<void> {
  const { db, carId, carTitle, requestUrl } = input;
  const url = new URL(requestUrl);
  const isLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!isLocalhost) return;

  const now = Math.floor(Date.now() / 1000);
  const includedCount = await db
    .prepare("SELECT COUNT(*) AS count FROM car_included_items WHERE company_car_id = ?")
    .bind(carId)
    .first<{ count: number }>();
  const rulesCount = await db
    .prepare("SELECT COUNT(*) AS count FROM car_rules WHERE company_car_id = ?")
    .bind(carId)
    .first<{ count: number }>();
  const featuresCount = await db
    .prepare("SELECT COUNT(*) AS count FROM car_features WHERE company_car_id = ?")
    .bind(carId)
    .first<{ count: number }>();
  const reviewsCount = await db
    .prepare("SELECT COUNT(*) AS count FROM car_reviews WHERE company_car_id = ?")
    .bind(carId)
    .first<{ count: number }>();
  const tripsCount = await db
    .prepare("SELECT COUNT(*) AS count FROM contracts WHERE company_car_id = ?")
    .bind(carId)
    .first<{ count: number }>();

  if (Number(includedCount?.count || 0) === 0) {
    const rows = [
      ["Convenience", "Skip the rental counter", "Use app instructions for pickup and return", "clock"],
      ["Convenience", "Additional drivers for free", null, "users"],
      ["Convenience", "30-minute return grace period", "No need to extend unless delay is longer than 30 min", "clock"],
      ["Peace of mind", "Keep the vehicle tidy", "Please return the vehicle in a clean condition.", "sparkles"],
      ["Peace of mind", "24/7 customer support", null, "support"],
    ] as const;
    for (const [category, title, description, iconKey] of rows) {
      await db
        .prepare("INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(carId, category, title, description, iconKey, 0, now, now)
        .run();
    }
  }

  if (Number(rulesCount?.count || 0) === 0) {
    const rows = [
      ["No smoking allowed", "Smoking may result in a fine.", "no_smoking"],
      ["Keep the vehicle tidy", "Unreasonably dirty vehicles may result in a fee.", "tidy"],
      ["Refuel the vehicle", "Missing fuel may result in an additional fee.", "fuel"],
      ["No off-roading", "Vehicle tracking may be used for recovery and protection.", "offroad"],
    ] as const;
    for (const [title, description, iconKey] of rows) {
      await db
        .prepare("INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(carId, title, description, iconKey, 0, now, now)
        .run();
    }
  }

  if (Number(featuresCount?.count || 0) === 0) {
    const rows = [
      ["Specifications", "Automatic transmission"],
      ["Specifications", "Air conditioning"],
      ["Safety", "ABS"],
      ["Safety", "Airbags"],
    ] as const;
    for (const [category, name] of rows) {
      await db
        .prepare("INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(carId, category, name, 0, now, now)
        .run();
    }
  }

  if (Number(tripsCount?.count || 0) === 0) {
    for (let i = 1; i <= 2; i += 1) {
      const userId = `seed-user-${carId}-${i}`;
      const email = `seed.user.${carId}.${i}@example.test`;
      const userExists = await db.prepare("SELECT id FROM users WHERE id = ? LIMIT 1").bind(userId).first<{ id: string }>();
      if (!userExists) {
        await db
          .prepare("INSERT INTO users (id, email, role, name, surname, phone, passport_number, created_at, updated_at) VALUES (?, ?, 'user', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
          .bind(userId, email, "Seed", `User ${i}`, `+66100${carId}${i}`, `SEED-${carId}-${i}`)
          .run();
      }

      await db
        .prepare(
          `
          INSERT INTO contracts (
            company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency, status, notes, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, ?, 'THB', 'closed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `
        )
        .bind(
          carId,
          userId,
          new Date(Date.now() - ((18 + i) * 24 * 60 * 60 * 1000)).toISOString(),
          new Date(Date.now() - ((15 + i) * 24 * 60 * 60 * 1000)).toISOString(),
          2500 + (i * 500),
          `seed-trip:${carId}:${i}`,
        )
        .run();
    }
  }

  if (Number(reviewsCount?.count || 0) === 0) {
    const rows = [
      ["Mila S", 5, `${carTitle}: super clean and easy pickup.`],
      ["Natt K", 5, "Everything matched the listing, no issues at return."],
      ["Aron P", 4.9, "Great communication and convenient handover."],
    ] as const;
    for (const [reviewerName, rating, reviewText] of rows) {
      await db
        .prepare(
          `
          INSERT INTO car_reviews (
            company_car_id, reviewer_name, reviewer_avatar_url, rating, review_text, review_date,
            cleanliness, maintenance, communication, convenience, accuracy, sort_order, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          carId,
          reviewerName,
          rating,
          reviewText,
          now * 1000,
          rating,
          rating,
          rating,
          rating,
          rating,
          0,
          now,
          now,
        )
        .run();
    }
  }

  await recalcCarRatingMetrics(db, carId);
}
