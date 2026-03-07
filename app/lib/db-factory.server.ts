import {
    type D1DatabaseLike as D1Database,
} from "./repo-types.server";
import * as bookingsRepo from "./bookings-repo.server";
import * as contractsRepo from "./contracts-repo.server";
import * as carsRepo from "./cars-repo.server";
import * as paymentsRepo from "./payments-repo.server";
import * as usersRepo from "./users-repo.server";
import * as companiesRepo from "./companies-repo.server";
import { requireScopedDashboardAccess } from "./access-policy.server";
import * as dictRepo from "./admin-dictionaries.server";
import type { AppLoadContext } from "~/types/context";

/**
 * Scoped Database Factory
 * Centralizes repository access and enforces tenant isolation (companyId filtering).
 */

export function createScopedDb(db: D1Database, companyId: number | null) {
    return {
        db,
        companyId,

        brands: {
            list: () => dictRepo.loadAdminBrands(db as any),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminBrandsPage(db as any, options),
            count: (search?: string) => dictRepo.countAdminBrands(db as any, search),
            getById: (id: number) => dictRepo.loadAdminBrandById(db as any, id),
        },

        models: {
            list: () => dictRepo.loadAdminModels(db as any),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminModelsPage(db as any, options),
            count: (search?: string) => dictRepo.countAdminModels(db as any, search),
        },

        locations: {
            list: (limit?: number) => dictRepo.loadAdminLocations(db as any, limit),
        },

        districts: {
            list: (options?: { includeDetails?: boolean; limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminDistricts(db as any, options),
        },

        hotels: {
            list: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminHotels(db as any, options),
            count: (search?: string) =>
                dictRepo.countAdminHotels(db as any, search),
        },

        colors: {
            list: () => dictRepo.loadAdminColors(db as any),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminColorsPage(db as any, options),
            count: (search?: string) => dictRepo.countAdminColors(db as any, search),
            getById: (id: number) => dictRepo.loadAdminColorById(db as any, id),
        },

        durations: {
            list: () => dictRepo.loadAdminDurations(db as any),
        },

        seasons: {
            list: () => dictRepo.loadAdminSeasons(db as any),
        },

        paymentStatuses: {
            list: () => dictRepo.loadAdminPaymentStatuses(db as any),
        },

        bookings: {
            list: (params: Omit<Parameters<typeof bookingsRepo.listBookingsPage>[0], "db" | "companyId">) =>
                bookingsRepo.listBookingsPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof bookingsRepo.countBookingsPage>[0], "db" | "companyId">) =>
                bookingsRepo.countBookingsPage({ ...params, db, companyId }),
            getById: (bookingId: number) =>
                bookingsRepo.getBookingDetailById({ db, bookingId, companyId }),
        },

        contracts: {
            list: (params: Omit<Parameters<typeof contractsRepo.listContractsPage>[0], "db" | "companyId">) =>
                contractsRepo.listContractsPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof contractsRepo.countContractsPage>[0], "db" | "companyId">) =>
                contractsRepo.countContractsPage({ ...params, db, companyId, status: params.status, search: params.search }),
            getStatusCounts: () =>
                contractsRepo.listContractStatusCounts({ db, companyId }),
            getDetail: (contractId: number) =>
                contractsRepo.getEditableContractById({ db, contractId, companyId }),
            getClosable: (contractId: number) =>
                contractsRepo.getClosableContractById({ db, contractId, companyId }),
        },

        cars: {
            list: (params: Omit<Parameters<typeof carsRepo.listCarsPage>[0], "db" | "companyId">) =>
                carsRepo.listCarsPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof carsRepo.countCarsPage>[0], "db" | "companyId">) =>
                carsRepo.countCarsPage({ ...params, db, companyId, status: params.status, search: params.search }),
            getStatusCounts: () =>
                carsRepo.listCarStatusCounts({ db, companyId }),
            getEditable: (carId: number) =>
                carsRepo.getEditableCarById({ db, carId, companyId }),
        },

        companies: {
            list: (params: Omit<Parameters<typeof companiesRepo.listCompaniesPage>[0], "db">) =>
                companiesRepo.listCompaniesPage({ ...params, db }),
            count: (params: Omit<Parameters<typeof companiesRepo.countCompanies>[0], "db">) =>
                companiesRepo.countCompanies({ ...params, db }),
            getById: (id: number) =>
                companiesRepo.getCompanyById({ db, id }),
        },

        payments: {
            list: (params: Omit<Parameters<typeof paymentsRepo.listPaymentsPage>[0], "db" | "companyId">) =>
                paymentsRepo.listPaymentsPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof paymentsRepo.countPaymentsPage>[0], "db" | "companyId">) =>
                paymentsRepo.countPaymentsPage({ ...params, db, companyId, status: params.status, search: params.search }),
            getStatusCounts: () =>
                paymentsRepo.listPaymentStatusCounts({ db, companyId }),
            getById: (paymentId: number) =>
                paymentsRepo.getPaymentById({ db, paymentId, companyId }),
        },

        users: {
            list: (params: Omit<Parameters<typeof usersRepo.listUsersPage>[0], "db" | "companyId">) =>
                usersRepo.listUsersPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof usersRepo.countUsersPage>[0], "db" | "companyId">) =>
                usersRepo.countUsersPage({ ...params, db, companyId }),
            getById: (userId: string) =>
                usersRepo.getUserById({ db, userId, companyId }),
            getRoleCounts: () => usersRepo.listUserRoleCounts({ db }),
            countByRole: (params: { role: string }) => {
                if (params.role === "manager" && companyId) return usersRepo.countCompanyManagers({ db, companyId });
                if (params.role === "user" && companyId) return usersRepo.countCompanyClients({ db, companyId });
                return usersRepo.countUsersPage({ db, role: params.role, search: "", companyId });
            }
        }
    };
}

export type ScopedDb = ReturnType<typeof createScopedDb>;

/**
 * Convenience helper for loaders/actions to get a scoped DB in one line.
 * Pass AppLoadContext directly — no need for `context as any`.
 */
export async function getScopedDb(
    request: Request,
    context: AppLoadContext | { cloudflare: { env: { DB: D1Database } } },
    accessFn: (request: Request) => Promise<{ user: any; companyId: number | null; isModMode: boolean; adminModCompanyId?: number | null }> = (r) => requireScopedDashboardAccess(r, { allowAdminGlobal: true })
) {
    const { companyId, user, isModMode, adminModCompanyId } = await accessFn(request);
    const db = context.cloudflare.env.DB;
    return {
        user,
        companyId,
        isModMode,
        adminModCompanyId,
        sdb: createScopedDb(db, companyId),
    };
}
