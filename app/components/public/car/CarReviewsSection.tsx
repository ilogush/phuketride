import Button from "~/components/public/Button";
import { StarIcon } from "@heroicons/react/24/solid";
import type { CarRatingSummary, CarReviewItem } from "~/components/public/car/types";

interface CarReviewsSectionProps {
  rating: CarRatingSummary | null;
  reviews: CarReviewItem[];
}

export default function CarReviewsSection({ rating, reviews }: CarReviewsSectionProps) {
  if (!rating && !reviews.length) {
    return null;
  }

  const ratingRows = [
    ["Cleanliness", rating?.cleanliness || 0],
    ["Maintenance", rating?.maintenance || 0],
    ["Communication", rating?.communication || 0],
    ["Convenience", rating?.convenience || 0],
    ["Accuracy", rating?.accuracy || 0],
  ] as const;

  return (
    <section className="rounded-2xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Ratings and reviews</h2>

      {rating ? (
        <>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold text-gray-800">{rating.totalRating.toFixed(2)}</span>
            <StarIcon className="w-6 h-6 text-indigo-600 mb-1" />
          </div>
          <p className="text-sm text-gray-500">({rating.totalRatings} ratings)</p>
          <div className="space-y-3 pt-2">
            {ratingRows.map(([label, score]) => (
              <div key={label} className="grid grid-cols-[160px_1fr_50px] items-center gap-3">
                <span className="text-sm text-gray-800">{label}</span>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(score / 5) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-800">{score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {reviews.length ? (
        <div className="pt-4 border-t border-gray-200 space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-center gap-3">
                {review.reviewerAvatarUrl ? (
                  <img
                    src={review.reviewerAvatarUrl}
                    alt={review.reviewerName}
                    className="w-14 h-14 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-200 text-gray-800 flex items-center justify-center text-sm font-semibold">
                    {review.reviewerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <StarIcon
                        key={`${review.id}-${idx}`}
                        className={`w-4 h-4 ${idx < review.rating ? "text-indigo-600" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {review.reviewerName}
                    {review.reviewDate ? ` • ${review.reviewDate}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{review.reviewText}</p>
            </div>
          ))}
          <div className="pt-2">
            <Button type="button" className="rounded-xl bg-indigo-600 text-white px-5 py-3 text-base font-medium hover:bg-indigo-700">
              See more
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
