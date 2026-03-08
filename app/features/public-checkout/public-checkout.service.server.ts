import { redirect } from "react-router";
import { z } from "zod";

import {
  buildDefaultTripDateRange,
  parseTripDateTime,
} from "~/components/public/trip-date.model";
import { isNonWorkingDateTime } from "~/lib/after-hours";
import { getQuickAuditStmt, getRequestMetadata } from "~/lib/audit-logger";
import { getCreateBookingEventsStmts, getCreateContractEventsStmts } from "~/lib/calendar-events.server";
import { buildCarPathSegment, parseCarPathSegment } from "~/lib/car-path";
import { getPrimaryCarPhotoUrl } from "~/lib/car-photos";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { calculateBaseTripTotal } from "~/lib/pricing";
import { calculateCheckoutPricing, type CheckoutPricingContext } from "~/lib/public-checkout.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";

const checkoutSubmitSchema = z.object({
  carId: z.coerce.number().int().positive("Car is required"),
  bookingRate: z.enum(["non_refundable", "refundable"] as const),
  clientPhone: z.string().trim().min(8, "Mobile number is required"),
  clientEmail: z.string().trim().email("Invalid email").or(z.literal("")),
  clientName: z.string().trim().min(1, "First name is required"),
  clientSurname: z.string().trim().min(1, "Last name is required"),
  pickupAt: z.coerce.number().int().positive("Pickup date is invalid"),
  returnAt: z.coerce.number().int().positive("Return date is invalid"),
  pickupDistrictId: z.coerce.number().int().nonnegative(),
  returnDistrictId: z.coerce.number().int().nonnegative(),
  withFullInsurance: z.enum(["true", "false"] as const),
  withBabySeat: z.enum(["true", "false"] as const),
  withIslandTrip: z.enum(["true", "false"] as const),
  withKrabiTrip: z.enum(["true", "false"] as const),
});

function failCheckoutRedirect(message: string) {
  return redirect(
    `/booking-confirmation?status=error&message=${encodeURIComponent(message)}`,
  );
}

async function loadCheckoutPricingCar(
  db: D1Database,
  carId: number,
): Promise<CheckoutPricingContext | null> {
  return (await db
    .prepare(
      `
      SELECT
        cc.id,
        cc.company_id AS companyId,
        cc.status,
        cc.price_per_day AS pricePerDay,
        cc.deposit AS deposit,
        cc.full_insurance_min_price AS fullInsuranceMinPrice,
        cc.full_insurance_max_price AS fullInsuranceMaxPrice,
        cc.min_rental_days AS minRentalDays,
        c.owner_id AS ownerId,
        c.name AS companyName,
        c.delivery_fee_after_hours AS deliveryFeeAfterHours,
        c.weekly_schedule AS weeklySchedule,
        c.holidays AS holidays,
        c.district_id AS companyDistrictId,
        c.baby_seat_price_per_day AS babySeatPricePerDay,
        c.island_trip_price AS islandTripPrice,
        c.krabi_trip_price AS krabiTripPrice
      FROM company_cars cc
      JOIN companies c ON c.id = cc.company_id
      WHERE cc.id = ? AND cc.archived_at IS NULL AND c.archived_at IS NULL
      LIMIT 1
      `,
    )
    .bind(carId)
    .first()) as CheckoutPricingContext | null;
}

export async function submitPublicCheckout(args: {
  request: Request;
  db: D1Database;
}) {
  const { request, db } = args;
  const formData = await request.formData();
  const parsed = parseWithSchema(
    checkoutSubmitSchema,
    Object.fromEntries(formData),
    "Invalid checkout form",
  );
  if (!parsed.ok) {
    return failCheckoutRedirect(parsed.error);
  }

  const nowIso = new Date().toISOString();
  const data = parsed.data;
  const pickupDate = new Date(data.pickupAt);
  const returnDate = new Date(data.returnAt);
  if (
    Number.isNaN(pickupDate.getTime()) ||
    Number.isNaN(returnDate.getTime()) ||
    returnDate <= pickupDate
  ) {
    return failCheckoutRedirect("Trip dates are invalid");
  }

  try {
    return await trackServerOperation({
      event: "public.checkout.submit",
      scope: "route.action",
      request,
      entityId: data.carId,
      details: {
        route: "cars.$id.checkout",
        bookingRate: data.bookingRate,
      },
      run: async () => {
        const car = await loadCheckoutPricingCar(db, data.carId);
        if (!car) {
          return failCheckoutRedirect("Car not found");
        }
        if (car.status !== "available") {
          return failCheckoutRedirect("This car is no longer available");
        }

        const pricing = await calculateCheckoutPricing({
          db,
          car,
          pickupDate,
          returnDate,
          pickupDistrictId: data.pickupDistrictId,
          returnDistrictId: data.returnDistrictId,
          withFullInsurance: data.withFullInsurance === "true",
          withBabySeat: data.withBabySeat === "true",
          withIslandTrip: data.withIslandTrip === "true",
          withKrabiTrip: data.withKrabiTrip === "true",
          bookingRate: data.bookingRate,
        });

        const overlappingContract = (await db
          .prepare(
            `
            SELECT id
            FROM contracts
            WHERE company_car_id = ? AND status = 'active'
              AND start_date < ? AND end_date > ?
            LIMIT 1
            `,
          )
          .bind(data.carId, returnDate.toISOString(), pickupDate.toISOString())
          .first()) as { id: number } | null;

        if (overlappingContract) {
          return failCheckoutRedirect("Car is already booked for the selected dates");
        }

        const existingClient = (await db
          .prepare(
            `
            SELECT id
            FROM users
            WHERE role = 'user' AND (email = ? OR phone = ?)
            LIMIT 1
            `,
          )
          .bind(data.clientEmail || "__missing__", data.clientPhone)
          .first()) as { id: string } | null;

        const clientId = existingClient?.id || crypto.randomUUID();
        if (!existingClient) {
          await db
            .prepare(
              `
              INSERT INTO users (
                id, email, role, name, surname, phone, created_at, updated_at
              ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?)
              `,
            )
            .bind(
              clientId,
              data.clientEmail || `${clientId}@guest.phuketride.local`,
              data.clientName,
              data.clientSurname,
              data.clientPhone,
              nowIso,
              nowIso,
            )
            .run();
        }

        const manager = (await db
          .prepare(
            `
            SELECT user_id AS userId
            FROM managers
            WHERE company_id = ?
            LIMIT 1
            `,
          )
          .bind(car.companyId)
          .first()) as { userId: string | null } | null;
        const managerId = manager?.userId || car.ownerId;
        if (!managerId) {
          return failCheckoutRedirect(
            "No partner manager is configured for this company",
          );
        }

        const bookingInsert = await db
          .prepare(
            `
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
            `,
          )
          .bind(
            data.carId,
            clientId,
            managerId,
            pickupDate.toISOString(),
            returnDate.toISOString(),
            pricing.totalAmount,
            pricing.depositAmount,
            data.clientName,
            data.clientSurname,
            data.clientPhone,
            data.clientEmail || null,
            pricing.resolvedPickupDistrictId || null,
            pricing.resolvedReturnDistrictId || null,
            pricing.deliveryFee + pricing.pickupAfterHoursFee,
            pricing.returnFee + pricing.returnAfterHoursFee,
            pricing.isFullInsuranceValid ? 1 : 0,
            pricing.selectedInsurance,
            data.withBabySeat === "true" ? 1 : 0,
            pricing.babySeatExtra,
            data.withIslandTrip === "true" ? 1 : 0,
            pricing.islandTripExtra,
            data.withKrabiTrip === "true" ? 1 : 0,
            pricing.krabiTripExtra,
            `Created from public checkout (${data.bookingRate})`,
            nowIso,
            nowIso,
          )
          .run();
        const bookingId = Number(bookingInsert.meta.last_row_id || 0);

        const contractInsert = await db
          .prepare(
            `
            INSERT INTO contracts (
              company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
              deposit_amount, deposit_currency, deposit_payment_method,
              pickup_district_id, return_district_id, delivery_cost, return_cost,
              status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, 'THB', NULL, ?, ?, ?, ?, 'active', ?, ?, ?)
            `,
          )
          .bind(
            data.carId,
            clientId,
            managerId,
            pickupDate.toISOString(),
            returnDate.toISOString(),
            pricing.totalAmount,
            pricing.depositAmount,
            pricing.resolvedPickupDistrictId || null,
            pricing.resolvedReturnDistrictId || null,
            pricing.deliveryFee + pricing.pickupAfterHoursFee,
            pricing.returnFee + pricing.returnAfterHoursFee,
            `Auto-generated from booking #${bookingId}`,
            nowIso,
            nowIso,
          )
          .run();
        const contractId = Number(contractInsert.meta.last_row_id || 0);

        const paymentTypeRows = (await db
          .prepare(
            `
            SELECT id, name
            FROM payment_types
            WHERE (company_id = ? OR company_id IS NULL)
            `,
          )
          .bind(car.companyId)
          .all()) as { results?: Array<{ id: number; name: string }> };
        const paymentTypeByName = new Map(
          (paymentTypeRows.results || []).map((row) => [
            String(row.name || "").toLowerCase(),
            Number(row.id),
          ]),
        );
        const paymentInsertStmts: D1PreparedStatement[] = [];
        const addPayment = (paymentTypeName: string, amount: number, notes: string) => {
          if (!(amount > 0)) return;
          const paymentTypeId = paymentTypeByName.get(paymentTypeName.toLowerCase());
          if (!paymentTypeId) return;
          paymentInsertStmts.push(
            db
              .prepare(
                `
                INSERT INTO payments (
                  contract_id, payment_type_id, amount, currency, payment_method, status, notes, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, 'THB', 'cash', 'pending', ?, ?, ?, ?)
                `,
              )
              .bind(
                contractId,
                paymentTypeId,
                Math.round(amount),
                notes,
                managerId,
                nowIso,
                nowIso,
              ),
          );
        };

        const deliveryFeeTotal = pricing.deliveryFee + pricing.pickupAfterHoursFee;
        const returnFeeTotal = pricing.returnFee + pricing.returnAfterHoursFee;
        const detailedExtrasTotal =
          pricing.selectedInsurance +
          pricing.babySeatExtra +
          pricing.islandTripExtra +
          pricing.krabiTripExtra;
        const rentalAmount = Math.max(
          0,
          pricing.totalAmount -
            deliveryFeeTotal -
            returnFeeTotal -
            detailedExtrasTotal -
            Math.round(pricing.salesTax),
        );

        addPayment("Rental Payment", rentalAmount, "Auto-generated from checkout");
        addPayment("Delivery Fee", deliveryFeeTotal, "Auto-generated from checkout");
        addPayment("Return Fee", returnFeeTotal, "Auto-generated from checkout");
        addPayment("Full Insurance", pricing.selectedInsurance, "Auto-generated from checkout");
        addPayment("Baby Seat", pricing.babySeatExtra, "Auto-generated from checkout");
        addPayment("Island Trip", pricing.islandTripExtra, "Auto-generated from checkout");
        addPayment("Krabi Trip", pricing.krabiTripExtra, "Auto-generated from checkout");
        addPayment("Deposit", pricing.depositAmount, "Deposit required at pickup");

        const finalStmts: D1PreparedStatement[] = [
          ...paymentInsertStmts,
          db
            .prepare(
              `
              INSERT INTO calendar_events (
                company_id, event_type, title, description,
                start_date, end_date, related_id, color,
                status, created_by, created_at, updated_at
              ) VALUES (?, 'booking', ?, ?, ?, NULL, ?, '#3B82F6', 'pending', ?, ?, ?)
              `,
            )
            .bind(
              car.companyId,
              `New booking #${bookingId}`,
              `New booking request created from public checkout for contract #${contractId}`,
              Date.now(),
              bookingId,
              managerId,
              nowIso,
              nowIso,
            ),
          ...getCreateBookingEventsStmts({
            db,
            companyId: car.companyId,
            bookingId,
            startDate: pickupDate,
            endDate: returnDate,
            createdBy: managerId,
          }),
          ...getCreateContractEventsStmts({
            db,
            companyId: car.companyId,
            contractId,
            startDate: pickupDate,
            endDate: returnDate,
            createdBy: managerId,
          }),
          getUpdateCarStatusStmt(db, data.carId, "rented"),
        ];
        await db.batch(finalStmts);

        const metadata = getRequestMetadata(request);
        await getQuickAuditStmt({
          db,
          userId: managerId,
          role: "partner",
          companyId: car.companyId,
          entityType: "booking",
          entityId: bookingId,
          action: "create",
          afterState: { bookingId, contractId, source: "public-checkout" },
          ...metadata,
        }).run();

        return redirect(
          `/booking-confirmation?contractId=${contractId}&bookingId=${bookingId}`,
        );
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit booking request";
    return failCheckoutRedirect(message);
  }
}

export async function loadPublicCheckoutPage(args: {
  db: D1Database;
  request: Request;
  routeCarPath: string | undefined;
}) {
  const { db, request, routeCarPath } = args;
  const parsedPath = parseCarPathSegment(routeCarPath);
  const url = new URL(request.url);
  const pickupDistrictId = Number(url.searchParams.get("pickupDistrictId") || 0);
  const returnDistrictId = Number(url.searchParams.get("returnDistrictId") || 0);
  const defaultTrip = buildDefaultTripDateRange();
  const startDateParam = String(url.searchParams.get("startDate") || defaultTrip.startDate);
  const endDateParam = String(url.searchParams.get("endDate") || defaultTrip.endDate);
  const startTimeParam = String(url.searchParams.get("startTime") || defaultTrip.startTime);
  const endTimeParam = String(url.searchParams.get("endTime") || defaultTrip.endTime);

  if (!parsedPath) {
    throw new Response("Invalid car path", { status: 400 });
  }

  const plateTail = String(parsedPath.plateTail || "").trim();
  const companyHint = String(parsedPath.companyHint || "").trim();
  const row = await db
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
    .bind(plateTail, plateTail, companyHint, companyHint)
    .all();

  const result = (row.results ?? []) as Array<Record<string, unknown>>;
  const car = result.find(
    (item) =>
      buildCarPathSegment(
        String(item.companyName || ""),
        String(item.brandName || ""),
        String(item.modelName || ""),
        String(item.licensePlate || ""),
      ) === parsedPath.full,
  );
  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }

  const carId = Number(car.id || 0);
  const photoUrl =
    getPrimaryCarPhotoUrl(car.photos, request.url, "/images/hero-bg.webp") ||
    "/images/hero-bg.webp";

  const companyId = Number(car.companyId || 0);
  const companyDistrictId = Number(car.companyDistrictId || 0);
  const districtSettings =
    companyId > 0
      ? await db
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
            `,
          )
          .bind(companyId)
          .all()
      : { results: [] };
  const deliveryByDistrict = new Map<
    number,
    { isActive: boolean; deliveryPrice: number; districtName: string }
  >();
  for (const item of (districtSettings.results ?? []) as Array<Record<string, unknown>>) {
    const districtId = Number(item.districtId || 0);
    if (districtId <= 0) continue;
    deliveryByDistrict.set(districtId, {
      isActive: Boolean(item.isActive),
      deliveryPrice: Number(item.deliveryPrice || 0),
      districtName: String(item.districtName || ""),
    });
  }

  const defaultDistrictId = companyDistrictId > 0 ? companyDistrictId : 0;
  const resolvedPickupDistrictId =
    pickupDistrictId > 0 ? pickupDistrictId : defaultDistrictId;
  const resolvedReturnDistrictId =
    returnDistrictId > 0 ? returnDistrictId : resolvedPickupDistrictId;
  const pickupSetting = deliveryByDistrict.get(resolvedPickupDistrictId);
  const returnSetting = deliveryByDistrict.get(resolvedReturnDistrictId);
  const deliveryFee = pickupSetting?.isActive
    ? Number(pickupSetting.deliveryPrice || 0)
    : 0;
  const returnFee = returnSetting?.isActive
    ? Number(returnSetting.deliveryPrice || 0)
    : 0;

  const start =
    parseTripDateTime(startDateParam, startTimeParam) ||
    parseTripDateTime(defaultTrip.startDate, defaultTrip.startTime)!;
  const endCandidate =
    parseTripDateTime(endDateParam, endTimeParam) ||
    parseTripDateTime(defaultTrip.endDate, defaultTrip.endTime)!;
  const end =
    endCandidate > start
      ? endCandidate
      : new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { days: tripDays, total: baseTripCost } = calculateBaseTripTotal(
    Number(car.pricePerDay || 0),
    start,
    end,
  );
  const minRentalDays = Math.max(1, Number(car.minRentalDays || 1));
  const effectiveRentalDays = Math.max(tripDays, minRentalDays);
  const insuranceTotal = 0;
  const afterHoursFee = Number(car.deliveryFeeAfterHours || 0);
  const pickupAfterHoursFee =
    afterHoursFee > 0 &&
    isNonWorkingDateTime({
      date: start,
      weeklyScheduleRaw: (car.weeklySchedule as string | null) ?? null,
      holidaysRaw: (car.holidays as string | null) ?? null,
    })
      ? afterHoursFee
      : 0;
  const returnAfterHoursFee =
    afterHoursFee > 0 &&
    isNonWorkingDateTime({
      date: end,
      weeklyScheduleRaw: (car.weeklySchedule as string | null) ?? null,
      holidaysRaw: (car.holidays as string | null) ?? null,
    })
      ? afterHoursFee
      : 0;
  const extrasTotal = pickupAfterHoursFee + returnAfterHoursFee;
  const subtotal = baseTripCost + deliveryFee + returnFee + extrasTotal + insuranceTotal;
  const salesTax = subtotal * 0.07;
  const tripTotal = subtotal + salesTax;
  const officeAddress = [
    String(car.companyStreet || "").trim(),
    String(car.companyHouseNumber || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const fallbackAddress =
    [
      officeAddress,
      String(car.districtName || "").trim(),
      String(car.locationName || "").trim(),
      String(car.companyName || "").trim(),
    ].find((part) => part.length > 0) || "Test address, Phuket 100";
  const fallbackYear = Number(car.year || 0) || 2020;
  const fallbackTrips = Number(car.trips || 0) || 3;
  const fallbackRating =
    Number(car.totalRating || 0) > 0 ? Number(car.totalRating) : 4.8;

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
    carName: `${String(car.brandName || "Car")} ${String(
      car.modelName || "Model",
    )} ${String(car.licensePlate || "").trim() || `#${carId}`}`,
    carBreadcrumbName: `${String(car.brandName || "Car")} ${String(
      car.modelName || "Model",
    )}`.trim(),
    year: fallbackYear,
    rating: fallbackRating.toFixed(1),
    trips: fallbackTrips,
    photoUrl,
    address: String(pickupSetting?.districtName || fallbackAddress),
    returnAddress: String(
      returnSetting?.districtName || pickupSetting?.districtName || fallbackAddress,
    ),
    insurancePricePerDay: car.insurancePricePerDay
      ? Number(car.insurancePricePerDay)
      : null,
    maxInsurancePrice: car.maxInsurancePrice
      ? Number(car.maxInsurancePrice)
      : null,
    minRentalDays,
    effectiveRentalDays,
    deposit: Number(car.deposit || 0),
    fullInsuranceMinPrice: car.fullInsuranceMinPrice
      ? Number(car.fullInsuranceMinPrice)
      : null,
    fullInsuranceMaxPrice: car.fullInsuranceMaxPrice
      ? Number(car.fullInsuranceMaxPrice)
      : null,
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
