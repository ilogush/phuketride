export type BookingDetailRow = {
  id: number;
  status: string;
  companyId: number;
  carId: number;
  carLicensePlate: string;
  carYear: number | null;
  brandName: string | null;
  modelName: string | null;
  colorName: string | null;
  pickupDistrictName: string | null;
  returnDistrictName: string | null;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  deposit_amount: number | null;
  deposit_paid: number | boolean;
  client_name: string | null;
  client_surname: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_passport: string | null;
  pickup_district_id: number | null;
  pickup_hotel: string | null;
  pickup_room: string | null;
  return_district_id: number | null;
  return_hotel: string | null;
  return_room: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  currency: string | null;
  full_insurance_enabled: number | boolean | null;
  full_insurance_price: number | null;
  baby_seat_enabled: number | boolean | null;
  baby_seat_price: number | null;
  island_trip_enabled: number | boolean | null;
  island_trip_price: number | null;
  krabi_trip_enabled: number | boolean | null;
  krabi_trip_price: number | null;
};

export type BookingForConversionRow = {
  id: number;
  status: string;
  companyCarId: number;
  clientId: string | null;
  startDate: string;
  endDate: string;
  estimatedAmount: number;
  currency: string | null;
  depositAmount: number | null;
  depositPaymentMethod: string | null;
  fullInsuranceEnabled: number | boolean | null;
  fullInsurancePrice: number | null;
  babySeatEnabled: number | boolean | null;
  babySeatPrice: number | null;
  islandTripEnabled: number | boolean | null;
  islandTripPrice: number | null;
  krabiTripEnabled: number | boolean | null;
  krabiTripPrice: number | null;
  pickupDistrictId: number | null;
  pickupHotel: string | null;
  pickupRoom: string | null;
  deliveryCost: number | null;
  returnDistrictId: number | null;
  returnHotel: string | null;
  returnRoom: string | null;
  returnCost: number | null;
  notes: string | null;
  clientName: string | null;
  clientSurname: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientPassport: string | null;
};

export function mapBookingDetailRow(bookingRaw: BookingDetailRow) {
  return {
    ...bookingRaw,
    startDate: bookingRaw.start_date,
    endDate: bookingRaw.end_date,
    estimatedAmount: bookingRaw.estimated_amount,
    depositAmount: bookingRaw.deposit_amount,
    depositPaid: !!bookingRaw.deposit_paid,
    clientName: bookingRaw.client_name,
    clientSurname: bookingRaw.client_surname,
    clientPhone: bookingRaw.client_phone,
    clientEmail: bookingRaw.client_email,
    clientPassport: bookingRaw.client_passport,
    pickupDistrictId: bookingRaw.pickup_district_id,
    pickupHotel: bookingRaw.pickup_hotel,
    pickupRoom: bookingRaw.pickup_room,
    returnDistrictId: bookingRaw.return_district_id,
    returnHotel: bookingRaw.return_hotel,
    returnRoom: bookingRaw.return_room,
    notes: bookingRaw.notes,
    createdAt: bookingRaw.created_at,
    updatedAt: bookingRaw.updated_at,
    currency: bookingRaw.currency || "THB",
    fullInsuranceEnabled: !!bookingRaw.full_insurance_enabled,
    fullInsurancePrice: bookingRaw.full_insurance_price,
    babySeatEnabled: !!bookingRaw.baby_seat_enabled,
    babySeatPrice: bookingRaw.baby_seat_price,
    islandTripEnabled: !!bookingRaw.island_trip_enabled,
    islandTripPrice: bookingRaw.island_trip_price,
    krabiTripEnabled: !!bookingRaw.krabi_trip_enabled,
    krabiTripPrice: bookingRaw.krabi_trip_price,
    companyCar: {
      id: bookingRaw.carId,
      companyId: bookingRaw.companyId,
      licensePlate: bookingRaw.carLicensePlate,
      year: bookingRaw.carYear,
      template: { brand: { name: bookingRaw.brandName }, model: { name: bookingRaw.modelName } },
      color: { name: bookingRaw.colorName },
    },
    pickupDistrict: { name: bookingRaw.pickupDistrictName },
    returnDistrict: { name: bookingRaw.returnDistrictName },
  };
}
