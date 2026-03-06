export interface ContractDetailsRow {
  id: number;
  startDate: string;
  endDate: string;
  actualEndDate: string | null;
  totalAmount: number;
  totalCurrency: string;
  depositAmount: number | null;
  depositCurrency: string | null;
  depositPaymentMethod: string | null;
  pickupHotel: string | null;
  pickupRoom: string | null;
  deliveryCost: number | null;
  returnHotel: string | null;
  returnRoom: string | null;
  returnCost: number | null;
  startMileage: number | null;
  endMileage: number | null;
  fuelLevel: string | null;
  cleanliness: string | null;
  status: string | null;
  photos: string | null;
  notes: string | null;
  createdAt: string;
  carId: number;
  carLicensePlate: string;
  carYear: number;
  carTransmission: string | null;
  carPhotos: string | null;
  brandName: string | null;
  modelName: string | null;
  colorName: string | null;
  pickupDistrictName: string | null;
  returnDistrictName: string | null;
  clientEmail: string | null;
}

export interface ExistingReviewRow {
  id: number;
  rating: number;
  cleanliness: number | null;
  maintenance: number | null;
  communication: number | null;
  convenience: number | null;
  accuracy: number | null;
  reviewText: string;
}

export interface ContractPaymentRow {
  id: number;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
  paymentTypeName: string | null;
  paymentTypeSign: "+" | "-" | null;
  extraType: "full_insurance" | "baby_seat" | "island_trip" | "krabi_trip" | null;
  extraEnabled: number | null;
  extraPrice: number | null;
}

export type ActionData = { ok: boolean; message?: string; error?: string } | null;
