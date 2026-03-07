import { redirect } from "react-router";
import { recalcCarRatingMetrics } from "~/lib/car-reviews.server";
import { requireCarAccess, withModCompanyId } from "~/lib/cars-content.server";

type IncludedItemRow = {
    id: number;
    category: string;
    title: string;
    description: string | null;
    iconKey: string | null;
    sortOrder: number;
};

type RuleRow = {
    id: number;
    title: string;
    description: string | null;
    iconKey: string | null;
    sortOrder: number;
};

type FeatureRow = {
    id: number;
    category: string;
    name: string;
    sortOrder: number;
};

type ReviewRow = {
    id: number;
    contractId: number | null;
    reviewerName: string | null;
    rating: number | null;
    reviewText: string | null;
    createdAt: number | string | null;
};

function redirectToContent(carId: number, modCompanyId: string | null, message: string, key: "success" | "error" = "success") {
    return redirect(withModCompanyId(`/cars/${carId}/content?${key}=${encodeURIComponent(message)}`, modCompanyId));
}

async function seedDemoContent(db: D1Database, carId: number, userId: string) {
    const now = Math.floor(Date.now() / 1000);
    const defaultIncluded = [
        ["Convenience", "Skip the rental counter", "Use app instructions for pickup and return", "clock"],
        ["Convenience", "Additional drivers for free", null, "users"],
        ["Convenience", "30-minute return grace period", "No need to extend unless delay is longer than 30 min", "clock"],
        ["Peace of mind", "Keep the vehicle tidy", "Please return the vehicle in a clean condition.", "sparkles"],
        ["Peace of mind", "24/7 customer support", null, "support"],
    ] as const;
    const defaultRules = [
        ["No smoking allowed", "Smoking may result in a fine.", "no_smoking"],
        ["Keep the vehicle tidy", "Unreasonably dirty vehicles may result in a fee.", "tidy"],
        ["Refuel the vehicle", "Missing fuel may result in an additional fee.", "fuel"],
        ["No off-roading", "Vehicle tracking may be used for recovery and protection.", "offroad"],
    ] as const;
    const defaultFeatures = [
        ["Specifications", "Automatic transmission"],
        ["Specifications", "Air conditioning"],
        ["Safety", "ABS"],
        ["Safety", "Airbags"],
    ] as const;

    const includedCount = await db.prepare("SELECT COUNT(*) AS count FROM car_included_items WHERE company_car_id = ?").bind(carId).first();
    if (Number((includedCount as { count?: number } | null)?.count || 0) === 0) {
        for (const [category, title, description, iconKey] of defaultIncluded) {
            await db
                .prepare("INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(carId, category, title, description, iconKey, 0, now, now)
                .run();
        }
    }

    const rulesCount = await db.prepare("SELECT COUNT(*) AS count FROM car_rules WHERE company_car_id = ?").bind(carId).first();
    if (Number((rulesCount as { count?: number } | null)?.count || 0) === 0) {
        for (const [title, description, iconKey] of defaultRules) {
            await db
                .prepare("INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(carId, title, description, iconKey, 0, now, now)
                .run();
        }
    }

    const featuresCount = await db.prepare("SELECT COUNT(*) AS count FROM car_features WHERE company_car_id = ?").bind(carId).first();
    if (Number((featuresCount as { count?: number } | null)?.count || 0) === 0) {
        for (const [category, name] of defaultFeatures) {
            await db
                .prepare("INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(carId, category, name, 0, now, now)
                .run();
        }
    }

    for (let i = 1; i <= 2; i += 1) {
        const email = `demo.review.${carId}.${i}@example.test`;
        const fullName = `Demo Client ${i}`;
        const passportNumber = `DEMO-${carId}-${i}`;
        let client = await db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first() as { id: string } | null;

        if (!client) {
            const userIdValue = crypto.randomUUID();
            await db
                .prepare(`
                    INSERT INTO users (id, email, role, name, surname, phone, passport_number, created_at, updated_at)
                    VALUES (?, ?, 'user', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `)
                .bind(userIdValue, email, "Demo", `Client ${i}`, `+66000000${i}`, passportNumber)
                .run();
            client = { id: userIdValue };
        }

        const existingContract = await db.prepare(`
            SELECT id
            FROM contracts
            WHERE company_car_id = ? AND client_id = ? AND status = 'closed' AND notes = ?
            LIMIT 1
        `).bind(carId, client.id, `seed-review:${carId}:${i}`).first() as { id: number } | null;

        let contractId = existingContract?.id || 0;
        if (!contractId) {
            const startDate = new Date(Date.now() - ((15 + i) * 24 * 60 * 60 * 1000)).toISOString();
            const endDate = new Date(Date.now() - ((12 + i) * 24 * 60 * 60 * 1000)).toISOString();
            const insertContract = await db.prepare(`
                INSERT INTO contracts (
                  company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency, status, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'THB', 'closed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(carId, client.id, userId, startDate, endDate, 3500 + i * 700, `seed-review:${carId}:${i}`).run();
            contractId = Number(insertContract.meta.last_row_id || 0);
        }

        const existingReview = await db.prepare("SELECT id FROM car_reviews WHERE contract_id = ? LIMIT 1").bind(contractId).first() as { id: number } | null;
        if (!existingReview) {
            await db.prepare(`
                INSERT INTO car_reviews (
                  company_car_id, contract_id, reviewer_user_id, reviewer_name, rating, review_text, review_date,
                  cleanliness, maintenance, communication, convenience, accuracy, sort_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                carId,
                contractId,
                client.id,
                fullName,
                5,
                i === 1 ? "Great car and smooth pickup process. Would rent again." : "Clean, reliable and exactly as described.",
                now * 1000,
                5,
                5,
                5,
                5,
                5,
                0,
                now,
                now,
            ).run();
        }
    }

    await recalcCarRatingMetrics(db, carId);
}

export async function loadCarContentManagementPage(args: {
    request: Request;
    context: { cloudflare: { env: Env } };
    carId: number;
}) {
    const { request, context, carId } = args;
    const { car } = await requireCarAccess(request, context, carId);
    const [includedItems, rules, features, reviews, contractsCount] = await Promise.all([
        context.cloudflare.env.DB.prepare(`
            SELECT id, category, title, description, icon_key AS iconKey, sort_order AS sortOrder
            FROM car_included_items
            WHERE company_car_id = ?
            ORDER BY sort_order ASC, id ASC
        `).bind(carId).all(),
        context.cloudflare.env.DB.prepare(`
            SELECT id, title, description, icon_key AS iconKey, sort_order AS sortOrder
            FROM car_rules
            WHERE company_car_id = ?
            ORDER BY sort_order ASC, id ASC
        `).bind(carId).all(),
        context.cloudflare.env.DB.prepare(`
            SELECT id, category, name, sort_order AS sortOrder
            FROM car_features
            WHERE company_car_id = ?
            ORDER BY sort_order ASC, id ASC
        `).bind(carId).all(),
        context.cloudflare.env.DB.prepare(`
            SELECT
              cr.id,
              cr.contract_id AS contractId,
              cr.reviewer_name AS reviewerName,
              cr.rating,
              cr.review_text AS reviewText,
              cr.created_at AS createdAt
            FROM car_reviews cr
            WHERE cr.company_car_id = ?
            ORDER BY cr.created_at DESC, cr.id DESC
        `).bind(carId).all(),
        context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM contracts WHERE company_car_id = ?").bind(carId).first(),
    ]);

    return {
        car,
        includedItems: (includedItems.results || []) as IncludedItemRow[],
        rules: (rules.results || []) as RuleRow[],
        features: (features.results || []) as FeatureRow[],
        reviews: (reviews.results || []) as ReviewRow[],
        contractsCount: Number((contractsCount as { count?: number } | null)?.count || 0),
    };
}

export async function handleCarContentManagementAction(args: {
    request: Request;
    context: { cloudflare: { env: Env } };
    carId: number;
}) {
    const { request, context, carId } = args;
    const url = new URL(request.url);
    const modCompanyId = url.searchParams.get("modCompanyId");
    const { user } = await requireCarAccess(request, context, carId);
    const formData = await request.formData();
    const intent = String(formData.get("intent") || "");
    const now = Math.floor(Date.now() / 1000);

    if (intent === "add_included") {
        const category = String(formData.get("category") || "Convenience").trim();
        const title = String(formData.get("title") || "").trim();
        const description = String(formData.get("description") || "").trim();
        const iconKey = String(formData.get("iconKey") || "sparkles").trim();
        if (!title) return redirectToContent(carId, modCompanyId, "Included title is required", "error");
        await context.cloudflare.env.DB.prepare(`
            INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_included_items WHERE company_car_id = ?), ?, ?)
        `).bind(carId, category, title, description || null, iconKey, carId, now, now).run();
        return redirectToContent(carId, modCompanyId, "Included item added");
    }

    if (intent === "delete_included") {
        const id = Number(formData.get("id") || 0);
        await context.cloudflare.env.DB.prepare("DELETE FROM car_included_items WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
        return redirectToContent(carId, modCompanyId, "Included item deleted");
    }

    if (intent === "add_rule") {
        const title = String(formData.get("title") || "").trim();
        const description = String(formData.get("description") || "").trim();
        const iconKey = String(formData.get("iconKey") || "offroad").trim();
        if (!title) return redirectToContent(carId, modCompanyId, "Rule title is required", "error");
        await context.cloudflare.env.DB.prepare(`
            INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_rules WHERE company_car_id = ?), ?, ?)
        `).bind(carId, title, description || null, iconKey, carId, now, now).run();
        return redirectToContent(carId, modCompanyId, "Rule added");
    }

    if (intent === "delete_rule") {
        const id = Number(formData.get("id") || 0);
        await context.cloudflare.env.DB.prepare("DELETE FROM car_rules WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
        return redirectToContent(carId, modCompanyId, "Rule deleted");
    }

    if (intent === "add_feature") {
        const category = String(formData.get("category") || "").trim();
        const name = String(formData.get("name") || "").trim();
        if (!category || !name) return redirectToContent(carId, modCompanyId, "Feature category and name are required", "error");
        await context.cloudflare.env.DB.prepare(`
            INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_features WHERE company_car_id = ?), ?, ?)
        `).bind(carId, category, name, carId, now, now).run();
        return redirectToContent(carId, modCompanyId, "Feature added");
    }

    if (intent === "delete_feature") {
        const id = Number(formData.get("id") || 0);
        await context.cloudflare.env.DB.prepare("DELETE FROM car_features WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
        return redirectToContent(carId, modCompanyId, "Feature deleted");
    }

    if (intent === "delete_review") {
        const reviewId = Number(formData.get("id") || 0);
        await context.cloudflare.env.DB.prepare("DELETE FROM car_reviews WHERE id = ? AND company_car_id = ?").bind(reviewId, carId).run();
        await recalcCarRatingMetrics(context.cloudflare.env.DB, carId);
        return redirectToContent(carId, modCompanyId, "Review deleted");
    }

    if (intent === "seed_demo") {
        await seedDemoContent(context.cloudflare.env.DB, carId, user.id);
        return redirectToContent(carId, modCompanyId, "Demo users, contracts, reviews and content have been seeded");
    }

    return redirectToContent(carId, modCompanyId, "Unknown action", "error");
}
