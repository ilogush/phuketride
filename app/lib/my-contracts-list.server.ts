export const CLIENT_CONTRACT_STATUSES = ["all", "active", "closed"] as const;
export type ClientContractStatusFilter = typeof CLIENT_CONTRACT_STATUSES[number];

export type ClientContractBaseRow = {
    id: number;
    startDate: string;
    endDate: string;
    totalAmount: number;
    totalCurrency: string;
    status: "active" | "closed";
    createdAt: string;
    carLicensePlate: string;
    carYear: number;
    brandName: string | null;
    modelName: string | null;
};

export type ClientContractRowWithColor = ClientContractBaseRow & {
    colorName: string | null;
};

interface CountRow {
    count: number;
}

type LoadClientContractsParams = {
    db: D1Database;
    userId: string;
    status: ClientContractStatusFilter;
    pageSize: number;
    offset: number;
    includeColor: boolean;
};

export async function loadClientContractsPage(params: LoadClientContractsParams) {
    const { db, userId, status, pageSize, offset, includeColor } = params;
    const whereSql = status === "all" ? "WHERE c.client_id = ?" : "WHERE c.client_id = ? AND c.status = ?";
    const countSql = `SELECT COUNT(*) AS count FROM contracts c ${whereSql}`;
    const countResult = status === "all"
        ? (await db.prepare(countSql).bind(userId).first() as CountRow | null)
        : (await db.prepare(countSql).bind(userId, status).first() as CountRow | null);

    const totalItems = Number(countResult?.count || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const colorSelect = includeColor ? ", cl.name AS colorName" : "";
    const colorJoin = includeColor ? "LEFT JOIN colors cl ON cl.id = cc.color_id" : "";
    const listSql = `
        SELECT
            c.id,
            c.start_date AS startDate,
            c.end_date AS endDate,
            c.total_amount AS totalAmount,
            c.total_currency AS totalCurrency,
            c.status,
            c.created_at AS createdAt,
            cc.license_plate AS carLicensePlate,
            cc.year AS carYear,
            cb.name AS brandName,
            cm.name AS modelName
            ${colorSelect}
        FROM contracts c
        JOIN company_cars cc ON cc.id = c.company_car_id
        LEFT JOIN car_templates ct ON ct.id = cc.template_id
        LEFT JOIN car_brands cb ON cb.id = ct.brand_id
        LEFT JOIN car_models cm ON cm.id = ct.model_id
        ${colorJoin}
        ${whereSql}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const listResult = status === "all"
        ? await db.prepare(listSql).bind(userId, pageSize, offset).all()
        : await db.prepare(listSql).bind(userId, status, pageSize, offset).all();

    return {
        totalPages,
        rows: (listResult.results ?? []) as Array<ClientContractBaseRow | ClientContractRowWithColor>,
    };
}
