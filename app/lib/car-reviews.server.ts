type ReviewScore = {
  rating: number;
  cleanliness: number;
  maintenance: number;
  communication: number;
  convenience: number;
  accuracy: number;
};

function toScore(value: unknown, fallback = 5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, n));
}

export function normalizeReviewScore(input: Partial<ReviewScore>): ReviewScore {
  const rating = toScore(input.rating, 5);
  return {
    rating,
    cleanliness: toScore(input.cleanliness, rating),
    maintenance: toScore(input.maintenance, rating),
    communication: toScore(input.communication, rating),
    convenience: toScore(input.convenience, rating),
    accuracy: toScore(input.accuracy, rating),
  };
}

export async function recalcCarRatingMetrics(db: D1Database, companyCarId: number): Promise<void> {
  const aggregates = await db
    .prepare(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS totalRating,
        COUNT(*) AS totalRatings,
        COALESCE(AVG(COALESCE(cleanliness, rating)), 0) AS cleanliness,
        COALESCE(AVG(COALESCE(maintenance, rating)), 0) AS maintenance,
        COALESCE(AVG(COALESCE(communication, rating)), 0) AS communication,
        COALESCE(AVG(COALESCE(convenience, rating)), 0) AS convenience,
        COALESCE(AVG(COALESCE(accuracy, rating)), 0) AS accuracy
      FROM car_reviews
      WHERE company_car_id = ?
      `
    )
    .bind(companyCarId)
    .first<{
      totalRating: number;
      totalRatings: number;
      cleanliness: number;
      maintenance: number;
      communication: number;
      convenience: number;
      accuracy: number;
    }>();

  const current = await db
    .prepare("SELECT id FROM car_rating_metrics WHERE company_car_id = ? LIMIT 1")
    .bind(companyCarId)
    .first<{ id: number }>();

  const now = Math.floor(Date.now() / 1000);
  const totalRatings = Number(aggregates?.totalRatings || 0);
  const totalRating = Number(aggregates?.totalRating || 0);
  const cleanliness = Number(aggregates?.cleanliness || 0);
  const maintenance = Number(aggregates?.maintenance || 0);
  const communication = Number(aggregates?.communication || 0);
  const convenience = Number(aggregates?.convenience || 0);
  const accuracy = Number(aggregates?.accuracy || 0);

  if (current?.id) {
    await db
      .prepare(
        `
        UPDATE car_rating_metrics
        SET
          total_rating = ?,
          total_ratings = ?,
          cleanliness = ?,
          maintenance = ?,
          communication = ?,
          convenience = ?,
          accuracy = ?,
          updated_at = ?
        WHERE id = ?
        `
      )
      .bind(
        totalRating,
        totalRatings,
        cleanliness,
        maintenance,
        communication,
        convenience,
        accuracy,
        now,
        current.id,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `
      INSERT INTO car_rating_metrics (
        company_car_id,
        total_rating,
        total_ratings,
        cleanliness,
        maintenance,
        communication,
        convenience,
        accuracy,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      companyCarId,
      totalRating,
      totalRatings,
      cleanliness,
      maintenance,
      communication,
      convenience,
      accuracy,
      now,
      now,
    )
    .run();
}
