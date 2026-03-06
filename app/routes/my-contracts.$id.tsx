import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import BackButton from "~/components/dashboard/BackButton";
import MyContractDetailsCards from "~/components/dashboard/contracts/MyContractDetailsCards";
import { normalizeReviewScore, recalcCarRatingMetrics } from "~/lib/car-reviews.server";
import { useUrlToast } from "~/lib/useUrlToast";
import type {
  ActionData,
  ContractDetailsRow,
  ContractPaymentRow,
  ExistingReviewRow,
} from "~/lib/my-contracts-detail-types";

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
  useUrlToast();
  const { contract, payments, existingReview, canLeaveReview } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <div className="space-y-6">
      <BackButton to="/my-bookings" />
      <MyContractDetailsCards
        contract={contract}
        payments={payments}
        existingReview={existingReview}
        canLeaveReview={canLeaveReview}
        actionData={actionData ?? null}
      />
    </div>
  );
}
