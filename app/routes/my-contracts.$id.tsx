import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form, useActionData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import BackButton from "~/components/dashboard/BackButton";
import Card from "~/components/dashboard/Card";
import StatusBadge from "~/components/dashboard/StatusBadge";
import { normalizeReviewScore, recalcCarRatingMetrics } from "~/lib/car-reviews.server";

interface ContractDetailsRow {
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

interface ExistingReviewRow {
  id: number;
  rating: number;
  cleanliness: number | null;
  maintenance: number | null;
  communication: number | null;
  convenience: number | null;
  accuracy: number | null;
  reviewText: string;
}

interface ContractPaymentRow {
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

type ActionData = { ok: boolean; message?: string; error?: string } | null;

const parseScore = (value: FormDataEntryValue | null): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const { id } = params;

  if (!id) {
    throw new Response("Contract ID is required", { status: 400 });
  }

  const contract = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        c.id,
        c.start_date AS startDate,
        c.end_date AS endDate,
        c.actual_end_date AS actualEndDate,
        c.total_amount AS totalAmount,
        c.total_currency AS totalCurrency,
        c.deposit_amount AS depositAmount,
        c.deposit_currency AS depositCurrency,
        c.deposit_payment_method AS depositPaymentMethod,
        c.pickup_hotel AS pickupHotel,
        c.pickup_room AS pickupRoom,
        c.delivery_cost AS deliveryCost,
        c.return_hotel AS returnHotel,
        c.return_room AS returnRoom,
        c.return_cost AS returnCost,
        c.start_mileage AS startMileage,
        c.end_mileage AS endMileage,
        c.fuel_level AS fuelLevel,
        c.cleanliness,
        c.status,
        c.photos,
        c.notes,
        c.created_at AS createdAt,
        cc.id AS carId,
        cc.license_plate AS carLicensePlate,
        cc.year AS carYear,
        cc.transmission AS carTransmission,
        cc.photos AS carPhotos,
        cb.name AS brandName,
        cm.name AS modelName,
        cl.name AS colorName,
        d_pick.name AS pickupDistrictName,
        d_ret.name AS returnDistrictName,
        u.email AS clientEmail
      FROM contracts c
      JOIN company_cars cc ON cc.id = c.company_car_id
      LEFT JOIN car_templates ct ON ct.id = cc.template_id
      LEFT JOIN car_brands cb ON cb.id = ct.brand_id
      LEFT JOIN car_models cm ON cm.id = ct.model_id
      LEFT JOIN colors cl ON cl.id = cc.color_id
      LEFT JOIN districts d_pick ON d_pick.id = c.pickup_district_id
      LEFT JOIN districts d_ret ON d_ret.id = c.return_district_id
      LEFT JOIN users u ON u.id = c.client_id
      WHERE c.id = ? AND c.client_id = ?
      LIMIT 1
      `
    )
    .bind(Number(id), user.id)
    .first()) as ContractDetailsRow | null;

  if (!contract) {
    throw new Response("Contract not found", { status: 404 });
  }

  const paymentsResult = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        p.id,
        p.amount,
        p.currency,
        p.payment_method AS paymentMethod,
        p.status,
        p.notes,
        p.created_at AS createdAt,
        p.extra_type AS extraType,
        p.extra_enabled AS extraEnabled,
        p.extra_price AS extraPrice,
        pt.name AS paymentTypeName,
        pt.sign AS paymentTypeSign
      FROM payments p
      LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      WHERE p.contract_id = ?
      ORDER BY p.created_at ASC
      `
    )
    .bind(Number(id))
    .all()) as { results?: ContractPaymentRow[] };
  const payments = paymentsResult.results || [];

  const existingReview = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        id,
        rating,
        cleanliness,
        maintenance,
        communication,
        convenience,
        accuracy,
        review_text AS reviewText
      FROM car_reviews
      WHERE contract_id = ?
      LIMIT 1
      `
    )
    .bind(Number(id))
    .first()) as ExistingReviewRow | null;

  const now = Date.now();
  const endTs = Number(new Date(contract.endDate).getTime());
  const isClosed = contract.status === "closed";
  const canLeaveReview = isClosed || (Number.isFinite(endTs) && endTs < now);

  return { contract, payments, existingReview, canLeaveReview };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const contractId = Number(params.id || 0);
  if (!Number.isFinite(contractId) || contractId <= 0) {
    return data<ActionData>({ ok: false, error: "Invalid contract id" }, { status: 400 });
  }

  const contract = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        c.id,
        c.company_car_id AS carId,
        c.client_id AS clientId,
        c.end_date AS endDate,
        c.status AS status
      FROM contracts c
      WHERE c.id = ? AND c.client_id = ?
      LIMIT 1
      `
    )
    .bind(contractId, user.id)
    .first()) as { id: number; carId: number; clientId: string; endDate: string; status: string | null } | null;

  if (!contract) {
    return data<ActionData>({ ok: false, error: "Contract not found" }, { status: 404 });
  }

  const endTs = Number(new Date(contract.endDate).getTime());
  const canLeaveReview = contract.status === "closed" || (Number.isFinite(endTs) && endTs < Date.now());
  if (!canLeaveReview) {
    return data<ActionData>({ ok: false, error: "Review is available only after rental completion" }, { status: 400 });
  }

  const formData = await request.formData();
  const reviewText = String(formData.get("reviewText") || "").trim();
  if (reviewText.length < 10) {
    return data<ActionData>({ ok: false, error: "Review text must be at least 10 characters" }, { status: 400 });
  }

  const score = normalizeReviewScore({
    rating: parseScore(formData.get("rating")),
    cleanliness: parseScore(formData.get("cleanliness")),
    maintenance: parseScore(formData.get("maintenance")),
    communication: parseScore(formData.get("communication")),
    convenience: parseScore(formData.get("convenience")),
    accuracy: parseScore(formData.get("accuracy")),
  });

  const reviewerName = [user.name, user.surname].filter(Boolean).join(" ").trim() || user.email;
  const now = Math.floor(Date.now() / 1000);
  const existing = await context.cloudflare.env.DB
    .prepare("SELECT id FROM car_reviews WHERE contract_id = ? LIMIT 1")
    .bind(contractId)
    .first() as { id: number } | null;

  if (existing?.id) {
    await context.cloudflare.env.DB
      .prepare(
        `
        UPDATE car_reviews
        SET
          reviewer_name = ?,
          rating = ?,
          review_text = ?,
          review_date = ?,
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
        reviewerName,
        score.rating,
        reviewText,
        now * 1000,
        score.cleanliness,
        score.maintenance,
        score.communication,
        score.convenience,
        score.accuracy,
        now,
        existing.id,
      )
      .run();
  } else {
    await context.cloudflare.env.DB
      .prepare(
        `
        INSERT INTO car_reviews (
          company_car_id,
          contract_id,
          reviewer_user_id,
          reviewer_name,
          reviewer_avatar_url,
          rating,
          review_text,
          review_date,
          cleanliness,
          maintenance,
          communication,
          convenience,
          accuracy,
          sort_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        contract.carId,
        contractId,
        user.id,
        reviewerName,
        user.avatarUrl || null,
        score.rating,
        reviewText,
        now * 1000,
        score.cleanliness,
        score.maintenance,
        score.communication,
        score.convenience,
        score.accuracy,
        0,
        now,
        now,
      )
      .run();
  }

  await recalcCarRatingMetrics(context.cloudflare.env.DB, contract.carId);
  return data<ActionData>({ ok: true, message: existing?.id ? "Review updated" : "Review submitted" });
}

export default function ContractDetails() {
  const { contract, payments, existingReview, canLeaveReview } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const extraNameMap: Record<string, string> = {
    full_insurance: "Full Insurance",
    baby_seat: "Baby Seat",
    island_trip: "Island Trip",
    krabi_trip: "Krabi Trip",
  };

  const carPhotos = contract.carPhotos ? JSON.parse(contract.carPhotos) : [];
  const contractPhotos = contract.photos ? JSON.parse(contract.photos) : [];
  const extras = payments.filter((p: ContractPaymentRow) => p.extraType && (p.extraEnabled ?? 0) === 1);

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "active":
        return "info";
      case "closed":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton to="/my-bookings" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.id}</h1>
            <p className="text-sm text-gray-500">Created {format(new Date(contract.createdAt), "MMM dd, yyyy")}</p>
          </div>
        </div>
        <StatusBadge variant={getStatusVariant(contract.status)}>{contract.status}</StatusBadge>
      </div>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {carPhotos.length > 0 ? (
              <img src={carPhotos[0]} alt="Car" className="w-full h-48 object-cover rounded-xl mb-4" />
            ) : null}
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-semibold">
                {contract.brandName} {contract.modelName} {contract.carYear}
              </p>
              <p className="text-sm text-gray-600">{contract.colorName} • {contract.carTransmission}</p>
              <p className="text-sm text-gray-600">License Plate: {contract.carLicensePlate}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rental Period</p>
              <div className="flex items-center gap-2 text-gray-900">
                <CalendarIcon className="h-5 w-5" />
                <span>
                  {format(new Date(contract.startDate), "MMM dd, yyyy")} - {format(new Date(contract.endDate), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
              <div className="flex items-center gap-2 text-gray-900">
                <MapPinIcon className="h-5 w-5" />
                <span>
                  {contract.pickupHotel || contract.pickupDistrictName}
                  {contract.pickupRoom ? `, Room ${contract.pickupRoom}` : ""}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Return Location</p>
              <div className="flex items-center gap-2 text-gray-900">
                <MapPinIcon className="h-5 w-5" />
                <span>
                  {contract.returnHotel || contract.returnDistrictName}
                  {contract.returnRoom ? `, Room ${contract.returnRoom}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Pricing Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-semibold">
              {contract.totalCurrency} {contract.totalAmount}
            </span>
          </div>
          {contract.depositAmount ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit</span>
              <span className="font-semibold">
                {contract.depositCurrency} {contract.depositAmount}
              </span>
            </div>
          ) : null}
          {extras.map((extra: ContractPaymentRow) => (
            <div key={`extra-${extra.id}`} className="flex justify-between">
              <span className="text-gray-600">{extraNameMap[String(extra.extraType)] || extra.extraType}</span>
              <span className="font-semibold">
                {extra.currency || contract.totalCurrency} {Number(extra.extraPrice ?? extra.amount ?? 0)}
              </span>
            </div>
          ))}
          {(contract.deliveryCost ?? 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-semibold">฿{contract.deliveryCost ?? 0}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{existingReview ? "Update your review" : "Leave a review"}</h2>
        {actionData?.error ? <p className="mb-3 text-sm text-red-600">{actionData.error}</p> : null}
        {actionData?.ok ? <p className="mb-3 text-sm text-green-700">{actionData.message}</p> : null}
        {canLeaveReview ? (
          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ["rating", "Overall"],
                ["cleanliness", "Cleanliness"],
                ["maintenance", "Maintenance"],
                ["communication", "Communication"],
                ["convenience", "Convenience"],
                ["accuracy", "Accuracy"],
              ].map(([name, label]) => (
                <label key={name} className="block">
                  <span className="mb-1 block text-sm text-gray-700">{label}</span>
                  <select
                    name={name}
                    defaultValue={String((existingReview as Record<string, number | string | null> | null)?.[name] || existingReview?.rating || 5)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                  >
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </label>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-700">Review</span>
              <textarea
                name="reviewText"
                defaultValue={existingReview?.reviewText || ""}
                minLength={10}
                required
                rows={5}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                placeholder="Share your rental experience"
              />
            </label>
            <button type="submit" className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              {existingReview ? "Update review" : "Submit review"}
            </button>
          </Form>
        ) : (
          <p className="text-sm text-gray-600">Review form becomes available after the rental is completed.</p>
        )}
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment: ContractPaymentRow) => (
              <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">
                    {payment.extraType ? (extraNameMap[String(payment.extraType)] || payment.extraType) : (payment.paymentTypeName || "Payment")}
                  </p>
                  <p className="text-sm text-gray-500">{format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${payment.paymentTypeSign === "-" ? "text-red-600" : "text-green-600"}`}>
                    {(payment.paymentTypeSign || "+")}{payment.currency} {payment.amount}
                  </p>
                  <p className="text-sm text-gray-500">{payment.paymentMethod}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No payments recorded</p>
        )}
      </Card>

      {contractPhotos.length ? (
        <Card padding="lg" className="shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Contract Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {contractPhotos.map((src: string, idx: number) => (
              <img key={`${src}-${idx}`} src={src} alt={`Contract photo ${idx + 1}`} className="w-full h-28 object-cover rounded-lg" />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
