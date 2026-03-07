import { isNonWorkingDateTime } from "~/lib/after-hours";
import { calculateBaseTripTotal } from "~/lib/pricing";

export type CheckoutPricingContext = {
  companyId: number;
  ownerId: string | null;
  companyName: string | null;
  status: string;
  pricePerDay: number;
  deliveryFeeAfterHours: number;
  weeklySchedule: string | null;
  holidays: string | null;
  companyDistrictId: number;
  deposit: number;
  fullInsuranceMinPrice: number;
  fullInsuranceMaxPrice: number;
  babySeatPricePerDay: number;
  islandTripPrice: number;
  krabiTripPrice: number;
  minRentalDays: number;
};

function resolveSelectedFullInsurancePrice(car: CheckoutPricingContext): number {
  const fullInsuranceMin = Number(car.fullInsuranceMinPrice || 0);
  const fullInsuranceMax = Number(car.fullInsuranceMaxPrice || 0);
  return Math.max(fullInsuranceMin, fullInsuranceMax, 0);
}

async function getCompanyDeliverySettings(db: D1Database, companyId: number) {
  if (companyId <= 0) {
    return new Map<number, { isActive: boolean; deliveryPrice: number }>();
  }

  const result = await db
    .prepare(
      `
      SELECT
        district_id AS districtId,
        is_active AS isActive,
        delivery_price AS deliveryPrice
      FROM company_delivery_settings
      WHERE company_id = ?
      `
    )
    .bind(companyId)
    .all();

  const settings = new Map<number, { isActive: boolean; deliveryPrice: number }>();
  for (const row of ((result.results ?? []) as Array<Record<string, unknown>>)) {
    const districtId = Number(row.districtId || 0);
    if (districtId <= 0) continue;
    settings.set(districtId, {
      isActive: Boolean(row.isActive),
      deliveryPrice: Number(row.deliveryPrice || 0),
    });
  }
  return settings;
}

export async function calculateCheckoutPricing(args: {
  db: D1Database;
  car: CheckoutPricingContext;
  pickupDate: Date;
  returnDate: Date;
  pickupDistrictId: number;
  returnDistrictId: number;
  withFullInsurance: boolean;
  withBabySeat: boolean;
  withIslandTrip: boolean;
  withKrabiTrip: boolean;
  bookingRate: "non_refundable" | "refundable";
}) {
  const {
    db,
    car,
    pickupDate,
    returnDate,
    pickupDistrictId,
    returnDistrictId,
    withFullInsurance,
    withBabySeat,
    withIslandTrip,
    withKrabiTrip,
    bookingRate,
  } = args;

  const deliverySettings = await getCompanyDeliverySettings(db, car.companyId);
  const defaultDistrictId = car.companyDistrictId > 0 ? car.companyDistrictId : 0;
  const resolvedPickupDistrictId = pickupDistrictId > 0 ? pickupDistrictId : defaultDistrictId;
  const resolvedReturnDistrictId = returnDistrictId > 0 ? returnDistrictId : resolvedPickupDistrictId;
  const pickupSetting = deliverySettings.get(resolvedPickupDistrictId);
  const returnSetting = deliverySettings.get(resolvedReturnDistrictId);
  const deliveryFee = pickupSetting?.isActive ? Number(pickupSetting.deliveryPrice || 0) : 0;
  const returnFee = returnSetting?.isActive ? Number(returnSetting.deliveryPrice || 0) : 0;

  const minRentalDays = Math.max(1, Number(car.minRentalDays || 1));
  const { days: tripDays, total: rawBaseTripCost } = calculateBaseTripTotal(Number(car.pricePerDay || 0), pickupDate, returnDate);
  const effectiveRentalDays = Math.max(tripDays, minRentalDays);
  const baseTripCost = effectiveRentalDays * Math.max(0, Number(car.pricePerDay || 0));
  const fullInsurancePrice = resolveSelectedFullInsurancePrice(car);
  const selectedInsurance = withFullInsurance ? fullInsurancePrice : 0;
  const babySeatExtra = withBabySeat ? Number(car.babySeatPricePerDay || 0) * effectiveRentalDays : 0;
  const islandTripExtra = withIslandTrip ? Number(car.islandTripPrice || 0) : 0;
  const krabiTripExtra = withKrabiTrip ? Number(car.krabiTripPrice || 0) : 0;
  const afterHoursFee = Number(car.deliveryFeeAfterHours || 0);
  const pickupAfterHoursFee = afterHoursFee > 0 && isNonWorkingDateTime({
    date: pickupDate,
    weeklyScheduleRaw: car.weeklySchedule ?? null,
    holidaysRaw: car.holidays ?? null,
  }) ? afterHoursFee : 0;
  const returnAfterHoursFee = afterHoursFee > 0 && isNonWorkingDateTime({
    date: returnDate,
    weeklyScheduleRaw: car.weeklySchedule ?? null,
    holidaysRaw: car.holidays ?? null,
  }) ? afterHoursFee : 0;
  const extrasTotal = pickupAfterHoursFee + returnAfterHoursFee + babySeatExtra + islandTripExtra + krabiTripExtra;
  const subtotal = baseTripCost + deliveryFee + returnFee + selectedInsurance + extrasTotal;
  const salesTax = subtotal * 0.07;
  const refundableRateFee = bookingRate === "refundable" ? 1000 : 0;
  const totalAmount = Math.round(subtotal + salesTax + refundableRateFee);
  const depositAmount = withFullInsurance ? 0 : Math.max(0, Number(car.deposit || 0));

  return {
    resolvedPickupDistrictId,
    resolvedReturnDistrictId,
    tripDays,
    effectiveRentalDays,
    rawBaseTripCost,
    baseTripCost,
    deliveryFee,
    returnFee,
    pickupAfterHoursFee,
    returnAfterHoursFee,
    selectedInsurance,
    babySeatExtra,
    islandTripExtra,
    krabiTripExtra,
    extrasTotal,
    salesTax,
    totalAmount,
    depositAmount,
  };
}
