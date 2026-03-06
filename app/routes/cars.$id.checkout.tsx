import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/cars.$id.checkout";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";
import CheckoutSummaryCard from "~/components/public/car/CheckoutSummaryCard";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { buildCarPathSegment, parseCarPathSegment } from "~/lib/car-path";
import { getPrimaryCarPhotoUrl } from "~/lib/car-photos";
import { calculateBaseTripTotal } from "~/lib/pricing";
import { isNonWorkingDateTime } from "~/lib/after-hours";
import { parseWithSchema } from "~/lib/validation.server";
import { getCreateBookingEventsStmts, getCreateContractEventsStmts } from "~/lib/calendar-events.server";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { getQuickAuditStmt, getRequestMetadata } from "~/lib/audit-logger";
import { useToast } from "~/lib/toast";

const textInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base text-gray-700 placeholder:text-gray-400 focus:border-green-600 focus:outline-none";
const money = (value: number) => `฿${Math.round(value).toLocaleString()}`;

const pad = (value: number) => String(value).padStart(2, "0");
const toDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toTimeInput = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const buildDefaultTrip = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 3);
  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
  };
};

const parseTripDateTime = (dateValue: string, timeValue: string) => {
  const candidate = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

export function meta({ data }: Route.MetaArgs) {
  const carName = data?.carName || "Car";
  const canonical = data?.canonicalUrl || "https://phuketride.com";
  const title = `Checkout ${carName} | Phuket Ride`;
  const description = `Complete your booking for ${carName} on Phuket Ride. Review trip details, insurance, and total pricing before payment.`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex,nofollow" },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

const checkoutSubmitSchema = z.object({
  carId: z.coerce.number().int().positive("Car is required"),
  bookingRate: z.enum(["non_refundable", "refundable"]),
  clientPhone: z.string().trim().min(8, "Mobile number is required"),
  clientEmail: z.string().trim().email("Invalid email").or(z.literal("")),
  clientName: z.string().trim().min(1, "First name is required"),
  clientSurname: z.string().trim().min(1, "Last name is required"),
  pickupAt: z.coerce.number().int().positive("Pickup date is invalid"),
  returnAt: z.coerce.number().int().positive("Return date is invalid"),
  pickupDistrictId: z.coerce.number().int().nonnegative(),
  returnDistrictId: z.coerce.number().int().nonnegative(),
  deliveryFee: z.coerce.number().min(0),
  returnFee: z.coerce.number().min(0),
  pickupAfterHoursFee: z.coerce.number().min(0),
  returnAfterHoursFee: z.coerce.number().min(0),
  baseTripCost: z.coerce.number().min(0),
  salesTax: z.coerce.number().min(0),
  selectedInsurance: z.coerce.number().min(0),
  babySeatExtra: z.coerce.number().min(0),
  islandTripExtra: z.coerce.number().min(0),
  krabiTripExtra: z.coerce.number().min(0),
  selectedTripTotal: z.coerce.number().min(0),
  depositAmount: z.coerce.number().min(0),
  withFullInsurance: z.enum(["true", "false"]),
  withBabySeat: z.enum(["true", "false"]),
  withIslandTrip: z.enum(["true", "false"]),
  withKrabiTrip: z.enum(["true", "false"]),
});

type CheckoutActionData = {
  error?: string;
};

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const failRedirect = (message: string) => redirect(`/booking-confirmation?status=error&message=${encodeURIComponent(message)}`);
  const parsed = parseWithSchema(checkoutSubmitSchema, Object.fromEntries(formData), "Invalid checkout form");
  if (!parsed.ok) {
    return failRedirect(parsed.error);
  }

  const nowIso = new Date().toISOString();
  const data = parsed.data;
  const pickupDate = new Date(data.pickupAt);
  const returnDate = new Date(data.returnAt);
  if (Number.isNaN(pickupDate.getTime()) || Number.isNaN(returnDate.getTime()) || returnDate <= pickupDate) {
    return failRedirect("Trip dates are invalid");
  }

  const refundableRateFee = data.bookingRate === "refundable" ? 1000 : 0;
  const deliveryFeeTotal = data.deliveryFee + data.pickupAfterHoursFee;
  const returnFeeTotal = data.returnFee + data.returnAfterHoursFee;
  const calculatedTripTotal = Math.round(
    data.baseTripCost +
    data.salesTax +
    refundableRateFee +
    deliveryFeeTotal +
    returnFeeTotal +
    data.selectedInsurance +
    data.babySeatExtra +
    data.islandTripExtra +
    data.krabiTripExtra
  );

  try {
    const car = await context.cloudflare.env.DB
      .prepare(`
        SELECT
          cc.id,
          cc.company_id AS companyId,
          cc.status,
          c.owner_id AS ownerId,
          c.name AS companyName
        FROM company_cars cc
        JOIN companies c ON c.id = cc.company_id
        WHERE cc.id = ? AND cc.archived_at IS NULL AND c.archived_at IS NULL
        LIMIT 1
      `)
      .bind(data.carId)
      .first() as { id: number; companyId: number; status: string; ownerId: string | null; companyName: string | null } | null;

    if (!car) {
      return failRedirect("Car not found");
    }
    if (car.status !== "available") {
      return failRedirect("This car is no longer available");
    }

    const overlappingContract = await context.cloudflare.env.DB
      .prepare(`
        SELECT id
        FROM contracts
        WHERE company_car_id = ? AND status = 'active'
          AND start_date < ? AND end_date > ?
        LIMIT 1
      `)
      .bind(data.carId, returnDate.toISOString(), pickupDate.toISOString())
      .first() as { id: number } | null;

    if (overlappingContract) {
      return failRedirect("Car is already booked for the selected dates");
    }

    const existingClient = await context.cloudflare.env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE role = 'user' AND (email = ? OR phone = ?)
        LIMIT 1
      `)
      .bind(data.clientEmail || "__missing__", data.clientPhone)
      .first() as { id: string } | null;

    const clientId = existingClient?.id || crypto.randomUUID();
    if (!existingClient) {
      await context.cloudflare.env.DB
        .prepare(`
          INSERT INTO users (
            id, email, role, name, surname, phone, created_at, updated_at
          ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
        `)
        .bind(
          clientId,
          data.clientEmail || `${clientId}@guest.phuketride.local`,
          data.clientName,
          data.clientSurname,
          data.clientPhone,
          nowIso,
          nowIso
        )
        .run();
    }

    const manager = await context.cloudflare.env.DB
      .prepare(`
        SELECT user_id AS userId
        FROM managers
        WHERE company_id = ?
        LIMIT 1
      `)
      .bind(car.companyId)
      .first() as { userId: string | null } | null;
    const managerId = manager?.userId || car.ownerId;
    if (!managerId) {
      return failRedirect("No partner manager is configured for this company");
    }

    const bookingInsert = await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO bookings (
          company_car_id, client_id, manager_id, start_date, end_date, estimated_amount, currency,
          deposit_amount, deposit_paid, deposit_payment_method,
          client_name, client_surname, client_phone, client_email,
          pickup_district_id, return_district_id, delivery_cost, return_cost,
          full_insurance_enabled, full_insurance_price,
          baby_seat_enabled, baby_seat_price,
          island_trip_enabled, island_trip_price,
          krabi_trip_enabled, krabi_trip_price,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
      `)
      .bind(
        data.carId,
        clientId,
        managerId,
        pickupDate.toISOString(),
        returnDate.toISOString(),
        calculatedTripTotal,
        data.depositAmount,
        data.clientName,
        data.clientSurname,
        data.clientPhone,
        data.clientEmail || null,
        data.pickupDistrictId || null,
        data.returnDistrictId || null,
        deliveryFeeTotal,
        returnFeeTotal,
        data.withFullInsurance === "true" ? 1 : 0,
        data.selectedInsurance,
        data.withBabySeat === "true" ? 1 : 0,
        data.babySeatExtra,
        data.withIslandTrip === "true" ? 1 : 0,
        data.islandTripExtra,
        data.withKrabiTrip === "true" ? 1 : 0,
        data.krabiTripExtra,
        `Created from public checkout (${data.bookingRate})`,
        nowIso,
        nowIso
      )
      .run();
    const bookingId = Number(bookingInsert.meta.last_row_id || 0);

    const contractInsert = await context.cloudflare.env.DB
      .prepare(`
        INSERT INTO contracts (
          company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
          deposit_amount, deposit_currency, deposit_payment_method,
          pickup_district_id, return_district_id, delivery_cost, return_cost,
          status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, 'THB', NULL, ?, ?, ?, ?, 'active', ?, ?, ?)
      `)
      .bind(
        data.carId,
        clientId,
        managerId,
        pickupDate.toISOString(),
        returnDate.toISOString(),
        calculatedTripTotal,
        data.depositAmount,
        data.pickupDistrictId || null,
        data.returnDistrictId || null,
        deliveryFeeTotal,
        returnFeeTotal,
        `Auto-generated from booking #${bookingId}`,
        nowIso,
        nowIso
      )
      .run();
    const contractId = Number(contractInsert.meta.last_row_id || 0);

    const paymentTypeRows = await context.cloudflare.env.DB
      .prepare(`
        SELECT id, name
        FROM payment_types
        WHERE (company_id = ? OR company_id IS NULL)
      `)
      .bind(car.companyId)
      .all() as { results?: Array<{ id: number; name: string }> };
    const paymentTypeByName = new Map(
      (paymentTypeRows.results || []).map((row) => [String(row.name || "").toLowerCase(), Number(row.id)])
    );
    const paymentInsertStmts: D1PreparedStatement[] = [];
    const addPayment = (paymentTypeName: string, amount: number, notes: string) => {
      if (!(amount > 0)) return;
      const paymentTypeId = paymentTypeByName.get(paymentTypeName.toLowerCase());
      if (!paymentTypeId) return;
      paymentInsertStmts.push(
        context.cloudflare.env.DB
          .prepare(`
            INSERT INTO payments (
              contract_id, payment_type_id, amount, currency, payment_method, status, notes, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, 'THB', 'cash', 'pending', ?, ?, ?, ?)
          `)
          .bind(contractId, paymentTypeId, Math.round(amount), notes, managerId, nowIso, nowIso)
      );
    };

    const detailedExtrasTotal = data.selectedInsurance + data.babySeatExtra + data.islandTripExtra + data.krabiTripExtra;
    const rentalAmount = Math.max(0, calculatedTripTotal - deliveryFeeTotal - returnFeeTotal - detailedExtrasTotal);
    addPayment("Rental Payment", rentalAmount, "Auto-generated from checkout");
    addPayment("Delivery Fee", deliveryFeeTotal, "Auto-generated from checkout");
    addPayment("Return Fee", returnFeeTotal, "Auto-generated from checkout");
    addPayment("Full Insurance", data.selectedInsurance, "Auto-generated from checkout");
    addPayment("Baby Seat", data.babySeatExtra, "Auto-generated from checkout");
    addPayment("Island Trip", data.islandTripExtra, "Auto-generated from checkout");
    addPayment("Krabi Trip", data.krabiTripExtra, "Auto-generated from checkout");
    addPayment("Deposit", data.depositAmount, "Deposit required at pickup");

    const finalStmts: D1PreparedStatement[] = [
      ...paymentInsertStmts,
      context.cloudflare.env.DB
        .prepare(`
          INSERT INTO calendar_events (
            company_id, event_type, title, description,
            start_date, end_date, related_id, color,
            status, created_by, created_at, updated_at
          ) VALUES (?, 'booking', ?, ?, ?, NULL, ?, '#3B82F6', 'pending', ?, ?, ?)
        `)
        .bind(
          car.companyId,
          `New booking #${bookingId}`,
          `New booking request created from public checkout for contract #${contractId}`,
          Date.now(),
          bookingId,
          managerId,
          nowIso,
          nowIso
        ),
      ...getCreateBookingEventsStmts({
        db: context.cloudflare.env.DB,
        companyId: car.companyId,
        bookingId,
        startDate: pickupDate,
        endDate: returnDate,
        createdBy: managerId,
      }),
      ...getCreateContractEventsStmts({
        db: context.cloudflare.env.DB,
        companyId: car.companyId,
        contractId,
        startDate: pickupDate,
        endDate: returnDate,
        createdBy: managerId,
      }),
      getUpdateCarStatusStmt(context.cloudflare.env.DB, data.carId, "rented"),
    ];
    await context.cloudflare.env.DB.batch(finalStmts);

    const metadata = getRequestMetadata(request);
    await getQuickAuditStmt({
      db: context.cloudflare.env.DB,
      userId: managerId,
      role: "partner",
      companyId: car.companyId,
      entityType: "booking",
      entityId: bookingId,
      action: "create",
      afterState: { bookingId, contractId, source: "public-checkout" },
      ...metadata,
    }).run();

    return redirect(`/booking-confirmation?contractId=${contractId}&bookingId=${bookingId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit booking request";
    return failRedirect(message);
  }
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;
  const parsedPath = parseCarPathSegment(params.id);
  const url = new URL(request.url);
  const pickupDistrictId = Number(url.searchParams.get("pickupDistrictId") || 0);
  const returnDistrictId = Number(url.searchParams.get("returnDistrictId") || 0);
  const defaultTrip = buildDefaultTrip();
  const startDateParam = String(url.searchParams.get("startDate") || defaultTrip.startDate);
  const endDateParam = String(url.searchParams.get("endDate") || defaultTrip.endDate);
  const startTimeParam = String(url.searchParams.get("startTime") || defaultTrip.startTime);
  const endTimeParam = String(url.searchParams.get("endTime") || defaultTrip.endTime);

  if (!parsedPath) {
    throw new Response("Invalid car path", { status: 400 });
  }
  const plateTail = String(parsedPath.plateTail || "").trim();
  const companyHint = String(parsedPath.companyHint || "").trim();

  const row = await d1
    .prepare(
      `
      SELECT
        cc.id AS id,
        cc.license_plate AS licensePlate,
        c.id AS companyId,
        cb.name AS brandName,
        cm.name AS modelName,
        cc.year AS year,
        cc.price_per_day AS pricePerDay,
        cc.insurance_price_per_day AS insurancePricePerDay,
        cc.max_insurance_price AS maxInsurancePrice,
        cc.min_rental_days AS minRentalDays,
        cc.deposit AS deposit,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.photos AS photos,
        c.name AS companyName,
        c.delivery_fee_after_hours AS deliveryFeeAfterHours,
        c.baby_seat_price_per_day AS babySeatPricePerDay,
        c.island_trip_price AS islandTripPrice,
        c.krabi_trip_price AS krabiTripPrice,
        c.weekly_schedule AS weeklySchedule,
        c.holidays AS holidays,
        c.district_id AS companyDistrictId,
        c.street AS companyStreet,
        c.house_number AS companyHouseNumber,
        l.name AS locationName,
        d.name AS districtName,
        (SELECT count(*) FROM contracts ctr WHERE ctr.company_car_id = cc.id) AS trips,
        (SELECT total_rating FROM car_rating_metrics m WHERE m.company_car_id = cc.id LIMIT 1) AS totalRating
      FROM company_cars cc
      LEFT JOIN car_templates ct ON cc.template_id = ct.id
      LEFT JOIN car_brands cb ON ct.brand_id = cb.id
      LEFT JOIN car_models cm ON ct.model_id = cm.id
      INNER JOIN companies c ON cc.company_id = c.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN districts d ON c.district_id = d.id
      WHERE cc.archived_at IS NULL
        AND c.archived_at IS NULL
        AND (
          LOWER(TRIM(COALESCE(cc.license_plate, ''))) = LOWER(TRIM(?))
          OR LOWER(COALESCE(cc.license_plate, '')) LIKE '%' || LOWER(?) || '%'
        )
        AND (
          ? = ''
          OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?) || '%'
        )
      LIMIT 20
      `,
    )
    .bind(
      plateTail,
      plateTail,
      companyHint,
      companyHint,
    )
    .all();

  const result = (row.results ?? []) as Array<Record<string, unknown>>;
  const car = result.find((item) => (
    buildCarPathSegment(
      String(item.companyName || ""),
      String(item.brandName || ""),
      String(item.modelName || ""),
      String(item.licensePlate || ""),
    ) === parsedPath.full
  ));
  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }
  const carId = Number(car.id || 0);

  const photoUrl = getPrimaryCarPhotoUrl(car.photos, request.url, "/images/hero-bg.webp") || "/images/hero-bg.webp";

  const companyId = Number(car.companyId || 0);
  const companyDistrictId = Number(car.companyDistrictId || 0);
  const districtSettings = companyId > 0
    ? await d1
        .prepare(
          `
          SELECT
            cds.district_id AS districtId,
            cds.is_active AS isActive,
            cds.delivery_price AS deliveryPrice,
            d.name AS districtName
          FROM company_delivery_settings cds
          JOIN districts d ON d.id = cds.district_id
          WHERE cds.company_id = ?
          `
        )
        .bind(companyId)
        .all()
    : { results: [] };
  const deliveryByDistrict = new Map<number, { isActive: boolean; deliveryPrice: number; districtName: string }>();
  for (const row of ((districtSettings.results ?? []) as Array<Record<string, unknown>>)) {
    const districtId = Number(row.districtId || 0);
    if (districtId <= 0) continue;
    deliveryByDistrict.set(districtId, {
      isActive: Boolean(row.isActive),
      deliveryPrice: Number(row.deliveryPrice || 0),
      districtName: String(row.districtName || ""),
    });
  }

  const defaultDistrictId = companyDistrictId > 0 ? companyDistrictId : 0;
  const resolvedPickupDistrictId = pickupDistrictId > 0 ? pickupDistrictId : defaultDistrictId;
  const resolvedReturnDistrictId = returnDistrictId > 0 ? returnDistrictId : resolvedPickupDistrictId;

  const pickupSetting = deliveryByDistrict.get(resolvedPickupDistrictId);
  const returnSetting = deliveryByDistrict.get(resolvedReturnDistrictId);
  const deliveryFee = pickupSetting?.isActive ? Number(pickupSetting.deliveryPrice || 0) : 0;
  const returnFee = returnSetting?.isActive ? Number(returnSetting.deliveryPrice || 0) : 0;

  const start = parseTripDateTime(startDateParam, startTimeParam) || parseTripDateTime(defaultTrip.startDate, defaultTrip.startTime)!;
  const endCandidate = parseTripDateTime(endDateParam, endTimeParam) || parseTripDateTime(defaultTrip.endDate, defaultTrip.endTime)!;
  const end = endCandidate > start
    ? endCandidate
    : new Date(start.getTime() + (3 * 24 * 60 * 60 * 1000));

  const { days: tripDays, total: baseTripCost } = calculateBaseTripTotal(Number(car.pricePerDay || 0), start, end);
  const minRentalDays = Math.max(1, Number(car.minRentalDays || 1));
  const effectiveRentalDays = Math.max(tripDays, minRentalDays);
  const insuranceTotal = 0;
  const afterHoursFee = Number(car.deliveryFeeAfterHours || 0);
  const pickupAfterHoursFee = afterHoursFee > 0 && isNonWorkingDateTime({
    date: start,
    weeklyScheduleRaw: (car.weeklySchedule as string | null) ?? null,
    holidaysRaw: (car.holidays as string | null) ?? null,
  }) ? afterHoursFee : 0;
  const returnAfterHoursFee = afterHoursFee > 0 && isNonWorkingDateTime({
    date: end,
    weeklyScheduleRaw: (car.weeklySchedule as string | null) ?? null,
    holidaysRaw: (car.holidays as string | null) ?? null,
  }) ? afterHoursFee : 0;
  const extrasTotal = pickupAfterHoursFee + returnAfterHoursFee;
  const subtotal = baseTripCost + deliveryFee + returnFee + extrasTotal + insuranceTotal;
  const salesTax = subtotal * 0.07;
  const tripTotal = subtotal + salesTax;
  const officeAddress = [String(car.companyStreet || "").trim(), String(car.companyHouseNumber || "").trim()].filter(Boolean).join(" ");
  const fallbackAddress = [
    officeAddress,
    String(car.districtName || "").trim(),
    String(car.locationName || "").trim(),
    String(car.companyName || "").trim(),
  ].find((part) => part.length > 0) || "Test address, Phuket 100";
  const fallbackYear = Number(car.year || 0) || 2020;
  const fallbackTrips = Number(car.trips || 0) || 3;
  const fallbackRating = Number(car.totalRating || 0) > 0 ? Number(car.totalRating) : 4.8;

  return {
    carId,
    companyId,
    pickupDistrictId: resolvedPickupDistrictId,
    returnDistrictId: resolvedReturnDistrictId,
    carPathSegment: buildCarPathSegment(
      String(car.companyName || ""),
      String(car.brandName || ""),
      String(car.modelName || ""),
      String(car.licensePlate || ""),
    ),
    carName: `${String(car.brandName || "Car")} ${String(car.modelName || "Model")} ${String(car.licensePlate || "").trim() || `#${carId}`}`,
    carBreadcrumbName: `${String(car.brandName || "Car")} ${String(car.modelName || "Model")}`.trim(),
    year: fallbackYear,
    rating: fallbackRating.toFixed(1),
    trips: fallbackTrips,
    photoUrl,
    address: String(pickupSetting?.districtName || fallbackAddress),
    returnAddress: String(returnSetting?.districtName || pickupSetting?.districtName || fallbackAddress),
    insurancePricePerDay: car.insurancePricePerDay ? Number(car.insurancePricePerDay) : null,
    maxInsurancePrice: car.maxInsurancePrice ? Number(car.maxInsurancePrice) : null,
    minRentalDays,
    effectiveRentalDays,
    deposit: Number(car.deposit || 0),
    fullInsuranceMinPrice: car.fullInsuranceMinPrice ? Number(car.fullInsuranceMinPrice) : null,
    fullInsuranceMaxPrice: car.fullInsuranceMaxPrice ? Number(car.fullInsuranceMaxPrice) : null,
    pickupAt: start.getTime(),
    returnAt: end.getTime(),
    deliveryFee,
    returnFee,
    extrasTotal,
    pickupAfterHoursFee,
    returnAfterHoursFee,
    babySeatPricePerDay: Number(car.babySeatPricePerDay || 0),
    islandTripPrice: Number(car.islandTripPrice || 0),
    krabiTripPrice: Number(car.krabiTripPrice || 0),
    tripDays,
    baseTripCost,
    insuranceTotal,
    subtotal,
    salesTax,
    includedDistance: tripDays * 100,
    tripTotal,
    canonicalUrl: request.url,
  };
}

export default function CheckoutPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<CheckoutActionData>();
  const navigation = useNavigation();
  const toast = useToast();
  const lastToastErrorRef = useRef<string | null>(null);
  const isSubmitting = navigation.state === "submitting";
  const [withFullInsurance, setWithFullInsurance] = useState(false);
  const [withBabySeat, setWithBabySeat] = useState(false);
  const [withIslandTrip, setWithIslandTrip] = useState(false);
  const [withKrabiTrip, setWithKrabiTrip] = useState(false);
  const [withUnlimitedTrips, setWithUnlimitedTrips] = useState(false);
  const [bookingRate, setBookingRate] = useState<"non_refundable" | "refundable">("non_refundable");
  const standardInsurance = Number(data.insuranceTotal || 0);
  const fullInsurance = Number(data.fullInsuranceMinPrice || data.fullInsuranceMaxPrice || 0);
  const hasFullInsurance = fullInsurance > 0;
  const hasBabySeatOption = Number(data.babySeatPricePerDay || 0) > 0;
  const hasIslandTripOption = Number(data.islandTripPrice || 0) > 0;
  const hasKrabiTripOption = Number(data.krabiTripPrice || 0) > 0;
  const unlimitedTripsExtra = 0;
  const selectedInsurance = withFullInsurance && hasFullInsurance ? fullInsurance : standardInsurance;
  const babySeatExtra = withBabySeat && hasBabySeatOption
    ? Number(data.babySeatPricePerDay || 0) * Number(data.effectiveRentalDays || 0)
    : 0;
  const islandTripExtra = withIslandTrip && hasIslandTripOption ? Number(data.islandTripPrice || 0) : 0;
  const krabiTripExtra = withKrabiTrip && hasKrabiTripOption ? Number(data.krabiTripPrice || 0) : 0;
  const liveExtrasTotal = Number(data.extrasTotal || 0) + babySeatExtra + islandTripExtra + krabiTripExtra + (withUnlimitedTrips ? unlimitedTripsExtra : 0);
  const effectiveDeposit = withFullInsurance && hasFullInsurance ? 0 : Number(data.deposit || 0);
  const liveSubtotal = Number(data.baseTripCost || 0) + Number(data.deliveryFee || 0) + Number(data.returnFee || 0) + selectedInsurance + liveExtrasTotal;
  const liveSalesTax = liveSubtotal * 0.07;
  const liveTripTotal = liveSubtotal + liveSalesTax;
  const refundableRateFee = 1000;
  const refundableTripTotal = liveTripTotal + refundableRateFee;
  const nonRefundableTripTotal = liveTripTotal;
  const nonRefundableDisplayedTotal = Math.round(nonRefundableTripTotal);
  const refundableDisplayedTotal = Math.round(refundableTripTotal);
  const refundableSavings = Math.max(0, refundableDisplayedTotal - nonRefundableDisplayedTotal);
  const selectedTripTotal = bookingRate === "refundable" ? refundableTripTotal : nonRefundableTripTotal;
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Cars" },
    { label: data.carBreadcrumbName, to: `/cars/${data.carPathSegment}` },
    { label: "Checkout" },
  ];

  useEffect(() => {
    if (!actionData?.error) {
      lastToastErrorRef.current = null;
      return;
    }
    if (lastToastErrorRef.current === actionData.error) {
      return;
    }
    lastToastErrorRef.current = actionData.error;
    void toast.error(actionData.error);
  }, [actionData?.error, toast]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4">
        <Form
          method="post"
          onSubmit={() => {
            // Allow showing the same error message on each new submit attempt.
            lastToastErrorRef.current = null;
          }}
        >
          <input type="hidden" name="carId" value={data.carId} />
          <input type="hidden" name="bookingRate" value={bookingRate} />
          <input type="hidden" name="pickupAt" value={data.pickupAt} />
          <input type="hidden" name="returnAt" value={data.returnAt} />
          <input type="hidden" name="pickupDistrictId" value={data.pickupDistrictId} />
          <input type="hidden" name="returnDistrictId" value={data.returnDistrictId} />
          <input type="hidden" name="deliveryFee" value={data.deliveryFee} />
          <input type="hidden" name="returnFee" value={data.returnFee} />
          <input type="hidden" name="pickupAfterHoursFee" value={data.pickupAfterHoursFee} />
          <input type="hidden" name="returnAfterHoursFee" value={data.returnAfterHoursFee} />
          <input type="hidden" name="baseTripCost" value={data.baseTripCost} />
          <input type="hidden" name="salesTax" value={liveSalesTax} />
          <input type="hidden" name="selectedInsurance" value={selectedInsurance} />
          <input type="hidden" name="babySeatExtra" value={babySeatExtra} />
          <input type="hidden" name="islandTripExtra" value={islandTripExtra} />
          <input type="hidden" name="krabiTripExtra" value={krabiTripExtra} />
          <input type="hidden" name="selectedTripTotal" value={selectedTripTotal} />
          <input type="hidden" name="depositAmount" value={effectiveDeposit} />
          <input type="hidden" name="withFullInsurance" value={String(withFullInsurance && hasFullInsurance)} />
          <input type="hidden" name="withBabySeat" value={String(withBabySeat && hasBabySeatOption)} />
          <input type="hidden" name="withIslandTrip" value={String(withIslandTrip && hasIslandTripOption)} />
          <input type="hidden" name="withKrabiTrip" value={String(withKrabiTrip && hasKrabiTripOption)} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
            <section className="lg:col-span-2">
              <div className="space-y-6">
              <section className="p-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Primary driver</h2>
                  <button
                    type="button"
                    className="rounded-xl border border-green-600 px-5 py-2 text-base font-semibold text-green-600"
                  >
                    Log in
                  </button>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Mobile number</span>
                    <input
                      name="clientPhone"
                      className={textInputClass}
                      placeholder="Mobile number"
                      required
                      defaultValue=""
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Email</span>
                    <input
                      type="email"
                      name="clientEmail"
                      className={textInputClass}
                      placeholder="Email"
                      defaultValue=""
                    />
                  </label>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">First name on driver’s license</span>
                    <input name="clientName" className={textInputClass} required defaultValue="" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-900">Last name on driver’s license</span>
                    <input name="clientSurname" className={textInputClass} required defaultValue="" />
                  </label>
                </div>
              </section>
              <div className={`grid gap-4 ${hasFullInsurance ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                <section
                  className={`rounded-2xl p-4 ${withFullInsurance ? "bg-gray-50" : "bg-green-50"}`}
                >
                  <h2 className="text-xl font-semibold text-gray-800">Standard insurance include</h2>
                  {data.effectiveRentalDays > data.tripDays ? (
                    <p className="mt-1 text-xs text-gray-600">
                      Minimum rental policy: charged for {data.effectiveRentalDays} days.
                    </p>
                  ) : null}
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>Damage and theft coverage</li>
                    <li>Roadside support assistance</li>
                    <li>Standard claim handling</li>
                    <li>Basic mileage terms</li>
                  </ul>
                </section>
                {hasFullInsurance ? (
                  <section className={`rounded-2xl bg-gray-50 p-4 ${withFullInsurance ? "bg-green-50" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold text-gray-800">Full insurance</h2>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={withFullInsurance}
                        onClick={() => setWithFullInsurance((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withFullInsurance ? "bg-green-600" : "bg-gray-300"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withFullInsurance ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                      {`${money(fullInsurance)} / day`}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-gray-600">
                      <li>Unlimited mileage for long trips</li>
                      <li>No deposit while full coverage is active</li>
                      <li>Priority support 24/7</li>
                      <li>Extended damage protection limits</li>
                      <li>Faster replacement process</li>
                      <li>Simplified claim paperwork</li>
                    </ul>
                  </section>
                ) : null}
              </div>

              <section className="rounded-2xl bg-gray-100 p-4 space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Booking rate</h2>
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setBookingRate("non_refundable")}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bookingRate === "non_refundable" ? "border-gray-800 bg-gray-800" : "border-gray-500 bg-white"}`}>
                          {bookingRate === "non_refundable" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-gray-900">Non-refundable</p>
                          <p className="mt-1 text-sm text-gray-600">Cancel for free for 24 hours. After that, the trip is non-refundable.</p>
                          <p className="mt-2 text-sm font-medium text-green-700">
                            Save {money(refundableSavings)} compared to refundable rate
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-gray-900">{money(nonRefundableDisplayedTotal)}</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-gray-300 mb-6" />

                  <button
                    type="button"
                    onClick={() => setBookingRate("refundable")}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${bookingRate === "refundable" ? "border-gray-800 bg-gray-800" : "border-gray-500 bg-white"}`}>
                          {bookingRate === "refundable" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-gray-900">Refundable</p>
                          <p className="mt-1 text-sm text-gray-600">Flexible cancellation terms before pickup date and time.</p>
                          <p className="mt-2 text-sm text-gray-600">
                            With Refundable rate, rental funds are recalculated in case of early return based on the actual rental period under the applicable terms.
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-gray-900">{money(refundableDisplayedTotal)}</p>
                    </div>
                  </button>
                </div>
              </section>

              <section className="p-1 space-y-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Extras</h2>
                  <p className="mt-1 text-xs text-gray-600">
                    Add optional services to match your route and passengers. Selected extras are reflected in the total immediately.
                  </p>
                </div>

                <div className="rounded-2xl border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Unlimited trips</p>
                      <p className="text-xs text-gray-600">Remove daily route restrictions for island travel plan changes.</p>
                      <p className="text-xs text-green-700">Included for this listing</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={withUnlimitedTrips}
                      onClick={() => setWithUnlimitedTrips((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withUnlimitedTrips ? "bg-green-600" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withUnlimitedTrips ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                <div className={`rounded-2xl border-b border-gray-200 pb-4 ${hasBabySeatOption ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Baby seat</p>
                      <p className="text-xs text-gray-600">
                        {hasBabySeatOption
                          ? `${money(Number(data.babySeatPricePerDay || 0))} / day`
                          : "Not available for this host right now"}
                      </p>
                      <p className="text-xs text-gray-600">Limited-stock item, confirmed with your booking request.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={withBabySeat && hasBabySeatOption}
                      onClick={() => hasBabySeatOption && setWithBabySeat((v) => !v)}
                      disabled={!hasBabySeatOption}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withBabySeat && hasBabySeatOption ? "bg-green-600" : "bg-gray-300"} ${hasBabySeatOption ? "" : "cursor-not-allowed opacity-60"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withBabySeat && hasBabySeatOption ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                <div className={`rounded-2xl border-b border-gray-200 pb-4 ${hasIslandTripOption ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Island trip</p>
                      <p className="text-xs text-gray-600">
                        {hasIslandTripOption
                          ? `${money(Number(data.islandTripPrice || 0))} one-time`
                          : "Not available for this host right now"}
                      </p>
                      <p className="text-xs text-gray-600">One-time add-on for trips to the islands of Koh Samui and Koh Phangan.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={withIslandTrip && hasIslandTripOption}
                      onClick={() => hasIslandTripOption && setWithIslandTrip((v) => !v)}
                      disabled={!hasIslandTripOption}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withIslandTrip && hasIslandTripOption ? "bg-green-600" : "bg-gray-300"} ${hasIslandTripOption ? "" : "cursor-not-allowed opacity-60"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withIslandTrip && hasIslandTripOption ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>

                <div className={`rounded-2xl ${hasKrabiTripOption ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Krabi trip</p>
                      <p className="text-xs text-gray-600">
                        {hasKrabiTripOption
                          ? `${money(Number(data.krabiTripPrice || 0))} one-time`
                          : "Not available for this host right now"}
                      </p>
                      <p className="text-xs text-gray-600">One-time add-on for approved Krabi direction routes.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={withKrabiTrip && hasKrabiTripOption}
                      onClick={() => hasKrabiTripOption && setWithKrabiTrip((v) => !v)}
                      disabled={!hasKrabiTripOption}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${withKrabiTrip && hasKrabiTripOption ? "bg-green-600" : "bg-gray-300"} ${hasKrabiTripOption ? "" : "cursor-not-allowed opacity-60"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withKrabiTrip && hasKrabiTripOption ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </section>
              <div className="pt-1">
                <Link
                  to={`/cars/${data.carPathSegment}`}
                  className="inline-flex items-center justify-center rounded-xl bg-green-600 text-white px-5 py-3 text-base font-medium hover:bg-green-700 gap-2"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  Back
                </Link>
              </div>
              </div>
            </section>

            <CheckoutSummaryCard
              carName={data.carName}
              photoUrl={data.photoUrl}
              year={data.year}
              rating={data.rating}
              trips={data.trips}
              pickupAt={data.pickupAt}
              returnAt={data.returnAt}
              address={data.address}
              returnAddress={data.returnAddress}
              deliveryFee={data.deliveryFee}
              returnFee={data.returnFee}
              extrasTotal={liveExtrasTotal}
              pickupAfterHoursFee={data.pickupAfterHoursFee}
              returnAfterHoursFee={data.returnAfterHoursFee}
              withUnlimitedTrips={withUnlimitedTrips}
              babySeatExtra={babySeatExtra}
              islandTripExtra={islandTripExtra}
              krabiTripExtra={krabiTripExtra}
              insuranceTotal={selectedInsurance}
              depositTotal={effectiveDeposit}
              subtotal={liveSubtotal}
              salesTax={liveSalesTax}
              includedDistance={data.includedDistance}
              tripTotal={selectedTripTotal}
              submitting={isSubmitting}
            />
          </div>
        </Form>
      </main>
      <Footer />
    </div>
  );
}
