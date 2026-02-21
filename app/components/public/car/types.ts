export interface CarReviewItem {
  id: number;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  reviewText: string;
  reviewDate: string | null;
}

export interface CarRatingSummary {
  totalRating: number;
  totalRatings: number;
  cleanliness: number;
  maintenance: number;
  communication: number;
  convenience: number;
  accuracy: number;
}

export interface CarIncludedItem {
  id: number;
  category: string;
  title: string;
  description: string | null;
  iconKey: string;
}

export interface CarRuleItem {
  id: number;
  title: string;
  description: string | null;
  iconKey: string;
}

export interface CarFeatureItem {
  id: number;
  category: string;
  name: string;
}
