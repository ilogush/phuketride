import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import BackButton from "~/components/dashboard/BackButton";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import { recalcCarRatingMetrics } from "~/lib/car-reviews.server";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type CarRow = {
  id: number;
  companyId: number;
  licensePlate: string | null;
  brandName: string | null;
  modelName: string | null;
};

function withModCompanyId(path: string, modCompanyId: string | null) {
  if (!modCompanyId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}modCompanyId=${modCompanyId}`;
}

async function requireCarAccess(request: Request, context: LoaderFunctionArgs["context"], carId: number) {
  const user = await requireAuth(request);
  const car = (await context.cloudflare.env.DB
    .prepare(
      `
      SELECT
        cc.id,
        cc.company_id AS companyId,
        cc.license_plate AS licensePlate,
        cb.name AS brandName,
        cm.name AS modelName
      FROM company_cars cc
      LEFT JOIN car_templates ct ON ct.id = cc.template_id
      LEFT JOIN car_brands cb ON cb.id = ct.brand_id
      LEFT JOIN car_models cm ON cm.id = ct.model_id
      WHERE cc.id = ?
      LIMIT 1
      `
    )
    .bind(carId)
    .first()) as CarRow | null;

  if (!car) {
    throw new Response("Car not found", { status: 404 });
  }
  if (user.role !== "admin" && car.companyId !== user.companyId) {
    throw new Response("Access denied", { status: 403 });
  }
  return { user, car };
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const carId = Number(params.id || 0);
  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  const { car } = await requireCarAccess(request, context, carId);
  const [includedItems, rules, features, reviews, contractsCount] = await Promise.all([
    context.cloudflare.env.DB
      .prepare(
        `
        SELECT id, category, title, description, icon_key AS iconKey, sort_order AS sortOrder
        FROM car_included_items
        WHERE company_car_id = ?
        ORDER BY sort_order ASC, id ASC
        `
      )
      .bind(carId)
      .all(),
    context.cloudflare.env.DB
      .prepare(
        `
        SELECT id, title, description, icon_key AS iconKey, sort_order AS sortOrder
        FROM car_rules
        WHERE company_car_id = ?
        ORDER BY sort_order ASC, id ASC
        `
      )
      .bind(carId)
      .all(),
    context.cloudflare.env.DB
      .prepare(
        `
        SELECT id, category, name, sort_order AS sortOrder
        FROM car_features
        WHERE company_car_id = ?
        ORDER BY sort_order ASC, id ASC
        `
      )
      .bind(carId)
      .all(),
    context.cloudflare.env.DB
      .prepare(
        `
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
        `
      )
      .bind(carId)
      .all(),
    context.cloudflare.env.DB
      .prepare("SELECT COUNT(*) AS count FROM contracts WHERE company_car_id = ?")
      .bind(carId)
      .first(),
  ]);

  return {
    car,
    includedItems: includedItems.results || [],
    rules: rules.results || [],
    features: features.results || [],
    reviews: reviews.results || [],
    contractsCount: Number((contractsCount as { count?: number } | null)?.count || 0),
  };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const carId = Number(params.id || 0);
  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }

  const url = new URL(request.url);
  const modCompanyId = url.searchParams.get("modCompanyId");
  const { user } = await requireCarAccess(request, context, carId);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const now = Math.floor(Date.now() / 1000);
  const redirectToContent = (msg: string, key: "success" | "error" = "success") =>
    redirect(withModCompanyId(`/cars/${carId}/content?${key}=${encodeURIComponent(msg)}`, modCompanyId));

  if (intent === "add_included") {
    const category = String(formData.get("category") || "Convenience").trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const iconKey = String(formData.get("iconKey") || "sparkles").trim();
    if (!title) return redirectToContent("Included title is required", "error");
    await context.cloudflare.env.DB
      .prepare(
        `
        INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_included_items WHERE company_car_id = ?), ?, ?)
        `
      )
      .bind(carId, category, title, description || null, iconKey, carId, now, now)
      .run();
    return redirectToContent("Included item added");
  }

  if (intent === "delete_included") {
    const id = Number(formData.get("id") || 0);
    await context.cloudflare.env.DB.prepare("DELETE FROM car_included_items WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
    return redirectToContent("Included item deleted");
  }

  if (intent === "add_rule") {
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const iconKey = String(formData.get("iconKey") || "offroad").trim();
    if (!title) return redirectToContent("Rule title is required", "error");
    await context.cloudflare.env.DB
      .prepare(
        `
        INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_rules WHERE company_car_id = ?), ?, ?)
        `
      )
      .bind(carId, title, description || null, iconKey, carId, now, now)
      .run();
    return redirectToContent("Rule added");
  }

  if (intent === "delete_rule") {
    const id = Number(formData.get("id") || 0);
    await context.cloudflare.env.DB.prepare("DELETE FROM car_rules WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
    return redirectToContent("Rule deleted");
  }

  if (intent === "add_feature") {
    const category = String(formData.get("category") || "").trim();
    const name = String(formData.get("name") || "").trim();
    if (!category || !name) return redirectToContent("Feature category and name are required", "error");
    await context.cloudflare.env.DB
      .prepare(
        `
        INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM car_features WHERE company_car_id = ?), ?, ?)
        `
      )
      .bind(carId, category, name, carId, now, now)
      .run();
    return redirectToContent("Feature added");
  }

  if (intent === "delete_feature") {
    const id = Number(formData.get("id") || 0);
    await context.cloudflare.env.DB.prepare("DELETE FROM car_features WHERE id = ? AND company_car_id = ?").bind(id, carId).run();
    return redirectToContent("Feature deleted");
  }

  if (intent === "delete_review") {
    const reviewId = Number(formData.get("id") || 0);
    await context.cloudflare.env.DB.prepare("DELETE FROM car_reviews WHERE id = ? AND company_car_id = ?").bind(reviewId, carId).run();
    await recalcCarRatingMetrics(context.cloudflare.env.DB, carId);
    return redirectToContent("Review deleted");
  }

  if (intent === "seed_demo") {
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

    const includedCount = await context.cloudflare.env.DB
      .prepare("SELECT COUNT(*) AS count FROM car_included_items WHERE company_car_id = ?")
      .bind(carId)
      .first();
    if (Number((includedCount as { count?: number } | null)?.count || 0) === 0) {
      for (const [category, title, description, iconKey] of defaultIncluded) {
        await context.cloudflare.env.DB
          .prepare("INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(carId, category, title, description, iconKey, 0, now, now)
          .run();
      }
    }

    const rulesCount = await context.cloudflare.env.DB
      .prepare("SELECT COUNT(*) AS count FROM car_rules WHERE company_car_id = ?")
      .bind(carId)
      .first();
    if (Number((rulesCount as { count?: number } | null)?.count || 0) === 0) {
      for (const [title, description, iconKey] of defaultRules) {
        await context.cloudflare.env.DB
          .prepare("INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(carId, title, description, iconKey, 0, now, now)
          .run();
      }
    }

    const featuresCount = await context.cloudflare.env.DB
      .prepare("SELECT COUNT(*) AS count FROM car_features WHERE company_car_id = ?")
      .bind(carId)
      .first();
    if (Number((featuresCount as { count?: number } | null)?.count || 0) === 0) {
      for (const [category, name] of defaultFeatures) {
        await context.cloudflare.env.DB
          .prepare("INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(carId, category, name, 0, now, now)
          .run();
      }
    }

    for (let i = 1; i <= 2; i += 1) {
      const email = `demo.review.${carId}.${i}@example.test`;
      const fullName = `Demo Client ${i}`;
      const passportNumber = `DEMO-${carId}-${i}`;
      let client = await context.cloudflare.env.DB
        .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
        .bind(email)
        .first() as { id: string } | null;
      if (!client) {
        const userId = crypto.randomUUID();
        await context.cloudflare.env.DB
          .prepare(
            `
            INSERT INTO users (id, email, role, name, surname, phone, passport_number, created_at, updated_at)
            VALUES (?, ?, 'user', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `
          )
          .bind(userId, email, "Demo", `Client ${i}`, `+66000000${i}`, passportNumber)
          .run();
        client = { id: userId };
      }

      const existingContract = await context.cloudflare.env.DB
        .prepare(
          `
          SELECT id
          FROM contracts
          WHERE company_car_id = ? AND client_id = ? AND status = 'closed' AND notes = ?
          LIMIT 1
          `
        )
        .bind(carId, client.id, `seed-review:${carId}:${i}`)
        .first() as { id: number } | null;

      let contractId = existingContract?.id || 0;
      if (!contractId) {
        const startDate = new Date(Date.now() - ((15 + i) * 24 * 60 * 60 * 1000)).toISOString();
        const endDate = new Date(Date.now() - ((12 + i) * 24 * 60 * 60 * 1000)).toISOString();
        const insertContract = await context.cloudflare.env.DB
          .prepare(
            `
            INSERT INTO contracts (
              company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'THB', 'closed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `
          )
          .bind(carId, client.id, user.id, startDate, endDate, 3500 + i * 700, `seed-review:${carId}:${i}`)
          .run();
        contractId = Number(insertContract.meta.last_row_id || 0);
      }

      const existingReview = await context.cloudflare.env.DB
        .prepare("SELECT id FROM car_reviews WHERE contract_id = ? LIMIT 1")
        .bind(contractId)
        .first() as { id: number } | null;
      if (!existingReview) {
        await context.cloudflare.env.DB
          .prepare(
            `
            INSERT INTO car_reviews (
              company_car_id, contract_id, reviewer_user_id, reviewer_name, rating, review_text, review_date,
              cleanliness, maintenance, communication, convenience, accuracy, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .bind(
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
          )
          .run();
      }
    }

    await recalcCarRatingMetrics(context.cloudflare.env.DB, carId);
    return redirectToContent("Demo users, contracts, reviews and content have been seeded");
  }

  return redirectToContent("Unknown action", "error");
}

export default function CarContentManagementPage() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const modCompanyId = searchParams.get("modCompanyId");
  const editPath = modCompanyId
    ? `/cars/${data.car.id}/edit?modCompanyId=${encodeURIComponent(modCompanyId)}`
    : `/cars/${data.car.id}/edit`;
  const title = `${data.car.brandName || "Car"} ${data.car.modelName || ""} ${data.car.licensePlate || ""}`.trim();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  return (
    <div className="space-y-4">
      <PageHeader
        leftActions={<BackButton to={editPath} />}
        title="Car Content & Reviews"
        rightActions={
          <Form method="post">
            <input type="hidden" name="intent" value="seed_demo" />
            <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Seed Demo Data
            </button>
          </Form>
        }
      />

      <Card padding="lg">
        {success ? <p className="mb-2 text-sm text-green-700">{success}</p> : null}
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-sm text-gray-600">Trips: {data.contractsCount} • Reviews: {data.reviews.length}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Included in the price</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_included" />
            <input name="category" placeholder="Category" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="title" placeholder="Title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="description" placeholder="Description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="iconKey" placeholder="Icon key (truck, users, clock...)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {data.includedItems.map((item: Record<string, unknown>) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.category)} • {String(item.title)}</p>
                <p className="text-xs text-gray-600">{String(item.description || "")}</p>
                <Form method="post" className="mt-2">
                  <input type="hidden" name="intent" value="delete_included" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">Delete</button>
                </Form>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Rules of the road</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_rule" />
            <input name="title" placeholder="Title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="description" placeholder="Description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="iconKey" placeholder="Icon key (no_smoking, tidy...)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {data.rules.map((item: Record<string, unknown>) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.title)}</p>
                <p className="text-xs text-gray-600">{String(item.description || "")}</p>
                <Form method="post" className="mt-2">
                  <input type="hidden" name="intent" value="delete_rule" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">Delete</button>
                </Form>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Features</h2>
          <Form method="post" className="space-y-2 mb-4">
            <input type="hidden" name="intent" value="add_feature" />
            <input name="category" placeholder="Category" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="name" placeholder="Feature name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">Add</button>
          </Form>
          <div className="space-y-2">
            {data.features.map((item: Record<string, unknown>) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">{String(item.category)} • {String(item.name)}</p>
                <Form method="post" className="mt-2">
                  <input type="hidden" name="intent" value="delete_feature" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">Delete</button>
                </Form>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold mb-3">Reviews</h2>
          <div className="space-y-2">
            {data.reviews.map((item: Record<string, unknown>) => (
              <div key={String(item.id)} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-sm">
                  {String(item.reviewerName)} • {String(item.rating)}/5 • Contract #{String(item.contractId || "n/a")}
                </p>
                <p className="text-xs text-gray-600">{String(item.reviewText || "")}</p>
                <Form method="post" className="mt-2">
                  <input type="hidden" name="intent" value="delete_review" />
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">Delete</button>
                </Form>
              </div>
            ))}
            {data.reviews.length === 0 ? <p className="text-sm text-gray-500">No reviews yet</p> : null}
          </div>
        </Card>
      </div>

      <div className="pt-2">
        <Link to={editPath} className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to car edit
        </Link>
      </div>
    </div>
  );
}
