import { countCompanies, listCompaniesPage } from "~/lib/companies-repo.server";
import type { SessionUser } from "~/lib/auth.server";
import type { CompanyListRow } from "~/lib/db-types";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { parseListFilters } from "~/lib/query-filters.server";

export type CompaniesPageRow = CompanyListRow & {
    partnerName: string;
    partnerArchived: boolean;
    status: string;
};

export interface CompaniesPageData {
    user: SessionUser;
    companies: CompaniesPageRow[];
    showArchived: boolean;
    totalCount: number;
    search: string;
}

import type { ScopedDb } from "~/lib/db-factory.server";

export async function loadCompaniesPageData(args: {
    request: Request;
    sdb: ScopedDb;
    user: SessionUser;
}): Promise<CompaniesPageData> {
    const { sdb, request, user } = args;
    const url = new URL(request.url);
    const showArchived = url.searchParams.get("archived") === "true";
    const { search, sortBy, sortOrder } = parseListFilters(url, {
        sortBy: ["createdAt", "id", "name", "carCount"] as const,
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
    });
    const { pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 10 });

    let companies: CompaniesPageRow[] = [];
    let totalCount = 0;

    try {
        const [countResult, rows] = await Promise.all([
            sdb.companies.count({
                showArchived,
                search,
            }),
            sdb.companies.list({
                showArchived,
                pageSize,
                offset,
                search,
                sortBy: sortBy || "createdAt",
                sortOrder,
            }),
        ]);

        totalCount = countResult;
        companies = rows.map((company) => ({
            ...company,
            partnerName: `${company.ownerName || ""} ${company.ownerSurname || ""}`.trim() || "-",
            partnerArchived: !!company.ownerArchivedAt,
            carCount: Number(company.carCount || 0),
            status: company.archivedAt ? "archived" : "active",
        }));
    } catch {
        companies = [];
    }

    return {
        user: args.user,
        companies,
        showArchived,
        totalCount,
        search,
    };
}
