import { normalizeReviewScore, recalcCarRatingMetrics } from "~/lib/car-reviews.server";
import { loadClientContractsPage, CLIENT_CONTRACT_STATUSES, type ClientContractStatusFilter } from "~/lib/my-contracts-list.server";
import type { ContractDetailsRow, ContractPaymentRow, ExistingReviewRow } from "~/lib/my-contracts-detail-types";
import { contractReviewSchema } from "~/schemas/review";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import type { SessionUser } from "~/lib/auth.server";

export const CLIENT_PAYMENT_STATUSES = ["all", "completed", "pending", "cancelled"] as const;
export type ClientPaymentStatusFilter = typeof CLIENT_PAYMENT_STATUSES[number];

export async function loadClientRentalHistoryPage(args: {
    db: D1Database;
    userId: string;
    url: URL;
    includeColor: boolean;
}) {
    const page = Math.max(1, Number.parseInt(args.url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const rawStatus = args.url.searchParams.get("status");
    const status = CLIENT_CONTRACT_STATUSES.includes(rawStatus as ClientContractStatusFilter)
        ? (rawStatus as ClientContractStatusFilter)
        : "all";

    const result = await loadClientContractsPage({
        db: args.db,
        userId: args.userId,
        status,
        pageSize,
        offset,
        includeColor: args.includeColor,
    });

    return {
        rows: result.rows,
        totalPages: result.totalPages,
        currentPage: page,
        status,
    };
}

type CountRow = { count: number | string } | null;

export type ClientPaymentRow = {
    id: number;
    amount: number;
    currency: string;
    paymentMethod: string | null;
    status: string | null;
    notes: string | null;
    createdAt: string;
    contractId: number;
    paymentTypeName: string;
    paymentTypeSign: "+" | "-";
    carLicensePlate: string;
    brandName: string | null;
    modelName: string | null;
};

export async function loadClientPaymentsHistoryPage(args: {
    db: D1Database;
    userId: string;
    url: URL;
}) {
    const page = Math.max(1, Number.parseInt(args.url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const rawStatus = args.url.searchParams.get("status");
    const status = CLIENT_PAYMENT_STATUSES.includes(rawStatus as ClientPaymentStatusFilter)
        ? (rawStatus as ClientPaymentStatusFilter)
        : "all";

    const whereSql = status === "all" ? "WHERE c.client_id = ?" : "WHERE c.client_id = ? AND p.status = ?";
    const countSql = `
        SELECT COUNT(*) AS count
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        ${whereSql}
    `;
    const countResult = status === "all"
        ? (await args.db.prepare(countSql).bind(args.userId).first() as CountRow)
        : (await args.db.prepare(countSql).bind(args.userId, status).first() as CountRow);

    const totalItems = Number(countResult?.count || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paymentsSql = `
        SELECT
            p.id,
            p.amount,
            p.currency,
            p.payment_method AS paymentMethod,
            p.status,
            p.notes,
            p.created_at AS createdAt,
            c.id AS contractId,
            pt.name AS paymentTypeName,
            pt.sign AS paymentTypeSign,
            cc.license_plate AS carLicensePlate,
            cb.name AS brandName,
            cm.name AS modelName
        FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        JOIN payment_types pt ON pt.id = p.payment_type_id
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const paymentsResult = status === "all"
        ? await args.db.prepare(paymentsSql).bind(args.userId, pageSize, offset).all()
        : await args.db.prepare(paymentsSql).bind(args.userId, status, pageSize, offset).all();

    return {
        payments: ((paymentsResult.results ?? []) as ClientPaymentRow[]),
        totalPages,
        currentPage: page,
        status,
    };
}

export async function loadClientContractDetailPage(args: {
    db: D1Database;
    contractId: number;
    userId: string;
}) {
    const contract = (await args.db
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
        .bind(args.contractId, args.userId)
        .first()) as ContractDetailsRow | null;

    if (!contract) {
        return null;
    }

    const paymentsResult = (await args.db
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
        .bind(args.contractId)
        .all()) as { results?: ContractPaymentRow[] };
    const existingReview = (await args.db
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
        .bind(args.contractId)
        .first()) as ExistingReviewRow | null;

    const now = Date.now();
    const endTs = Number(new Date(contract.endDate).getTime());
    const canLeaveReview = contract.status === "closed" || (Number.isFinite(endTs) && endTs < now);

    return {
        contract,
        payments: paymentsResult.results ?? [],
        existingReview,
        canLeaveReview,
    };
}

export async function submitClientContractReview(args: {
    db: D1Database;
    request: Request;
    contractId: number;
    user: SessionUser;
}) {
    if (!Number.isFinite(args.contractId) || args.contractId <= 0) {
        return redirectWithRequestError(args.request, "/my-contracts", "Invalid contract id");
    }

    const contract = (await args.db
        .prepare(
            `
            SELECT
                c.id,
                c.company_car_id AS carId,
                c.end_date AS endDate,
                c.status
            FROM contracts c
            WHERE c.id = ? AND c.client_id = ?
            LIMIT 1
            `
        )
        .bind(args.contractId, args.user.id)
        .first()) as { id: number; carId: number; endDate: string; status: string | null } | null;

    if (!contract) {
        return redirectWithRequestError(args.request, "/my-contracts", "Contract not found");
    }

    const endTs = Number(new Date(contract.endDate).getTime());
    const canLeaveReview = contract.status === "closed" || (Number.isFinite(endTs) && endTs < Date.now());
    if (!canLeaveReview) {
        return redirectWithRequestError(args.request, `/my-contracts/${args.contractId}`, "Review is available only after rental completion");
    }

    const formData = await args.request.formData();
    const parsed = parseWithSchema(contractReviewSchema, {
        reviewText: formData.get("reviewText"),
        rating: formData.get("rating"),
        cleanliness: formData.get("cleanliness"),
        maintenance: formData.get("maintenance"),
        communication: formData.get("communication"),
        convenience: formData.get("convenience"),
        accuracy: formData.get("accuracy"),
    });
    if (!parsed.ok) {
        return redirectWithRequestError(args.request, `/my-contracts/${args.contractId}`, parsed.error);
    }

    const score = normalizeReviewScore(parsed.data);
    const reviewerName = [args.user.name, args.user.surname].filter(Boolean).join(" ").trim() || args.user.email;
    const now = Math.floor(Date.now() / 1000);
    const existing = await args.db
        .prepare("SELECT id FROM car_reviews WHERE contract_id = ? LIMIT 1")
        .bind(args.contractId)
        .first() as { id: number } | null;

    if (existing?.id) {
        await args.db
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
                parsed.data.reviewText,
                now * 1000,
                score.cleanliness,
                score.maintenance,
                score.communication,
                score.convenience,
                score.accuracy,
                now,
                existing.id
            )
            .run();
    } else {
        await args.db
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
                args.contractId,
                args.user.id,
                reviewerName,
                args.user.avatarUrl || null,
                score.rating,
                parsed.data.reviewText,
                now * 1000,
                score.cleanliness,
                score.maintenance,
                score.communication,
                score.convenience,
                score.accuracy,
                0,
                now,
                now
            )
            .run();
    }

    await recalcCarRatingMetrics(args.db, contract.carId);
    return redirectWithRequestSuccess(
        args.request,
        `/my-contracts/${args.contractId}`,
        existing?.id ? "Review updated" : "Review submitted"
    );
}
