import { redirect } from "react-router";

import type { SessionUser } from "~/lib/auth.server";
import { requireAuth } from "~/lib/auth.server";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { validateCompanyAccess } from "~/lib/security.server";

export interface CompanyVehicle {
  id: number;
  licensePlate: string;
  year: number | null;
  pricePerDay: number | null;
  status: string | null;
  mileage: number | null;
  brandName: string | null;
  modelName: string | null;
}

export interface CompanyTeamMember {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
}

type CompanyDetailRow = {
  id: number;
  name: string;
  owner_id: string;
  email: string | null;
};

type ActivityRow = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  status: string;
};

export async function loadCompanyDetailPage(args: {
  request: Request;
  db: D1Database;
  companyIdParam: string | undefined;
}) {
  const { request, db, companyIdParam } = args;
  const user = await requireAuth(request);
  const companyId = Number.parseInt(companyIdParam || "0", 10);

  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Response("Invalid company id", { status: 400 });
  }

  if (user.role === "admin") {
    return redirect(`/home?modCompanyId=${companyId}`);
  }

  if (user.role === "user") {
    throw new Response("Forbidden", { status: 403 });
  }

  const effectiveCompanyId = getEffectiveCompanyId(request, user);
  if (effectiveCompanyId !== companyId) {
    throw new Response("Forbidden", { status: 403 });
  }

  await validateCompanyAccess(db, companyId);

  let company: CompanyDetailRow | null = null;
  let stats = {
    totalVehicles: 0,
    inWorkshop: 0,
    activeBookings: 0,
    upcomingBookings: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    totalCustomers: 0,
  };
  let recentActivity: ActivityRow[] = [];
  let vehicles: CompanyVehicle[] = [];
  let teamMembers: CompanyTeamMember[] = [];

  try {
    const companyData = await db
      .prepare(
        `
        SELECT
          id, name, email, phone, telegram, location_id, district_id, street, house_number,
          bank_name, account_number, account_name, swift_code, delivery_fee_after_hours,
          island_trip_price, krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays,
          owner_id, created_at, updated_at
        FROM companies
        WHERE id = ?
        LIMIT 1
        `,
      )
      .bind(companyId)
      .all();

    company = (companyData.results?.[0] as CompanyDetailRow | undefined) || null;
    if (!company) {
      throw new Response("Company not found", { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const statsRow = (await db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM company_cars WHERE company_id = ?) AS totalVehicles,
          (SELECT COUNT(*) FROM company_cars WHERE company_id = ? AND status = 'maintenance') AS inWorkshop,
          (
            SELECT COUNT(*)
            FROM contracts c
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ? AND c.status = 'active'
          ) AS activeBookings,
          (
            SELECT COUNT(*)
            FROM contracts c
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ? AND c.start_date >= ?
          ) AS upcomingBookings,
          (
            SELECT COALESCE(SUM(p.amount), 0)
            FROM payments p
            INNER JOIN contracts c ON p.contract_id = c.id
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ?
          ) AS totalRevenue,
          (
            SELECT COALESCE(SUM(p.amount), 0)
            FROM payments p
            INNER JOIN contracts c ON p.contract_id = c.id
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ? AND p.created_at >= ?
          ) AS thisMonthRevenue,
          (
            SELECT COUNT(DISTINCT c.client_id)
            FROM contracts c
            INNER JOIN company_cars cc ON c.company_car_id = cc.id
            WHERE cc.company_id = ?
          ) AS totalCustomers
        `,
      )
      .bind(
        companyId,
        companyId,
        companyId,
        companyId,
        now.getTime(),
        companyId,
        companyId,
        startOfMonth.getTime(),
        companyId,
      )
      .first()) as Record<string, unknown> | null;

    stats = {
      totalVehicles: Number(statsRow?.totalVehicles || 0),
      inWorkshop: Number(statsRow?.inWorkshop || 0),
      activeBookings: Number(statsRow?.activeBookings || 0),
      upcomingBookings: Number(statsRow?.upcomingBookings || 0),
      totalRevenue: Number(statsRow?.totalRevenue || 0),
      thisMonthRevenue: Number(statsRow?.thisMonthRevenue || 0),
      totalCustomers: Number(statsRow?.totalCustomers || 0),
    };

    const vehiclesData = await db
      .prepare(
        `
        SELECT
          cc.id AS id,
          cc.license_plate AS licensePlate,
          cc.year AS year,
          cc.price_per_day AS pricePerDay,
          cc.status AS status,
          cc.mileage AS mileage,
          cb.name AS brandName,
          cm.name AS modelName
        FROM company_cars cc
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        WHERE cc.company_id = ?
        ORDER BY cc.created_at DESC
        LIMIT ${QUERY_LIMITS.LARGE}
        `,
      )
      .bind(companyId)
      .all();

    vehicles = ((vehiclesData.results ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: Number(row.id),
        licensePlate: String(row.licensePlate || ""),
        year: row.year === null ? null : Number(row.year),
        pricePerDay: row.pricePerDay === null ? null : Number(row.pricePerDay),
        status: (row.status as string | null) ?? null,
        mileage: row.mileage === null ? null : Number(row.mileage),
        brandName: (row.brandName as string | null) ?? null,
        modelName: (row.modelName as string | null) ?? null,
      }),
    );

    const teamMembersData = await db
      .prepare(
        `
        SELECT
          u.id as id,
          u.name as name,
          u.surname as surname,
          u.email as email,
          u.phone as phone,
          'owner' as role,
          u.avatar_url as avatarUrl
        FROM companies c
        JOIN users u ON u.id = c.owner_id
        WHERE c.id = ?
        UNION ALL
        SELECT
          u.id as id,
          u.name as name,
          u.surname as surname,
          u.email as email,
          u.phone as phone,
          'manager' as role,
          u.avatar_url as avatarUrl
        FROM managers m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.company_id = ? AND m.is_active = 1
        `,
      )
      .bind(companyId, companyId)
      .all();

    teamMembers = ((teamMembersData.results ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: String(row.id || ""),
        name: (row.name as string | null) ?? null,
        surname: (row.surname as string | null) ?? null,
        email: String(row.email || ""),
        phone: (row.phone as string | null) ?? null,
        role: String(row.role || ""),
        avatarUrl: (row.avatarUrl as string | null) ?? null,
      }),
    );

    const activityData = await db
      .prepare(
        `
        SELECT
          id, title, description,
          start_date as startDate,
          status
        FROM calendar_events
        WHERE company_id = ? AND status = 'pending'
        ORDER BY start_date DESC
        LIMIT 10
        `,
      )
      .bind(companyId)
      .all();

    recentActivity = (activityData.results ?? []) as ActivityRow[];
  } catch {
    // Keep page resilient and show empty states if partial loading fails.
  }

  return {
    user: user as SessionUser,
    company,
    stats,
    vehicles,
    teamMembers,
    recentActivity,
  };
}
