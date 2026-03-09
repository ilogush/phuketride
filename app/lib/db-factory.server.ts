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
import * as cache from "./dictionaries-cache.server";
import * as carTemplatesRepo from "./car-templates.server";
import * as auditLogger from "./audit-logger";
import * as analyticsRepo from "./admin-analytics-repo.server";
import * as carsCreateRepo from "./cars-create-page.server";
import * as companiesCreateRepo from "./companies-create-page.server";
import * as dashboardRepo from "./dashboard-metrics.server";
import * as userProfileRepo from "./user-profile.server";
import * as locationsPageRepo from "./locations-page.server";
import * as calendarPageRepo from "./calendar-page.server";
import * as paymentsCreateRepo from "./payments-create.server";
import * as appLayoutRepo from "./app-layout.server";
import * as seasonsActions from "./seasons-actions.server";
import * as durationsActions from "./durations-actions.server";
import * as settingsActions from "./settings-actions.server";
import * as locationsActions from "./locations-actions.server";
import * as contractsNewAction from "./contracts-new-action.server";
import * as carsCreateAction from "./cars-create-action.server";
import * as carsEditAction from "./cars-edit-action.server";
import * as bookingsCreateAction from "./bookings-create.server";
import type { SessionUser } from "./auth.server";
import type { AppLoadContext } from "~/types/context";


/**
 * Scoped Database Factory
 * Centralizes repository access and enforces tenant isolation (companyId filtering).
 *
 * NOTE on types:
 * Repo functions in the project use two DB type families:
 * - `D1DatabaseLike` (from repo-types.server.ts) — used by standardised repo files (bookings, contracts, cars, etc.)
 * - Global `D1Database` (from worker-configuration.d.ts) — used by utility/action/dictionary files
 * Both are structurally identical at runtime. We cast once at the factory boundary
 * so individual call-sites don't need `as any`.
 */

export function createScopedDb(db: D1Database, companyId: number | null) {
    // Single boundary cast: runtime identity is the same, types diverge only nominally.
    const rawDb = db as unknown as globalThis.D1Database;

    return {
        db,
        /** Pre-cast reference for functions that accept the global D1Database type */
        rawDb,
        companyId,

        brands: {
            list: () => dictRepo.loadAdminBrands(rawDb),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminBrandsPage(rawDb, options),
            count: (search?: string) => dictRepo.countAdminBrands(rawDb, search),
            getById: (id: number) => dictRepo.loadAdminBrandById(rawDb, id),
        },

        models: {
            list: () => dictRepo.loadAdminModels(rawDb),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminModelsPage(rawDb, options),
            count: (search?: string) => dictRepo.countAdminModels(rawDb, search),
        },

        locations: {
            list: (limit?: number) => cache.getCachedLocations(rawDb),
            getPageData: (params: Omit<Parameters<typeof locationsPageRepo.loadLocationsPageData>[0], "db">) =>
                locationsPageRepo.loadLocationsPageData({ ...params, db: rawDb }),
            handleAction: (args: Omit<Parameters<typeof locationsActions.handleLocationsAction>[0], "db">) =>
                locationsActions.handleLocationsAction({ ...args, db: rawDb }),
        },

        districts: {
            list: (options?: { includeDetails?: boolean; limit?: number; offset?: number; search?: string }) =>
                cache.getCachedDistricts(rawDb),
            count: (search?: string) => dictRepo.countAdminDistricts(rawDb, search),
        },

        hotels: {
            list: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminHotels(rawDb, options),
            count: (search?: string) =>
                dictRepo.countAdminHotels(rawDb, search),
        },

        colors: {
            list: () => dictRepo.loadAdminColors(rawDb),
            listPage: (options?: { limit?: number; offset?: number; search?: string }) =>
                dictRepo.loadAdminColorsPage(rawDb, options),
            count: (search?: string) => dictRepo.countAdminColors(rawDb, search),
            getById: (id: number) => dictRepo.loadAdminColorById(rawDb, id),
        },

        durations: {
            list: () => dictRepo.loadAdminDurations(rawDb),
            handleAction: (args: Omit<Parameters<typeof durationsActions.handleDurationsAction>[0], "db">) =>
                durationsActions.handleDurationsAction({ ...args, db: rawDb }),
        },

        seasons: {
            list: () => dictRepo.loadAdminSeasons(rawDb),
            handleAction: (args: Omit<Parameters<typeof seasonsActions.handleSeasonsAction>[0], "db">) =>
                seasonsActions.handleSeasonsAction({ ...args, db: rawDb }),
        },

        paymentStatuses: {
            list: () => dictRepo.loadAdminPaymentStatuses(rawDb),
        },

        currencies: {
            list: () => cache.getCachedCurrencies(rawDb),
            listDetailed: () => cache.getCachedCurrenciesDetailed(rawDb),
            listActiveForCompany: (id: number | null) => cache.getCachedActiveCurrenciesForCompany(rawDb, id),
        },

        paymentTemplates: {
            listForCompany: (id: number) => cache.getCachedPaymentTemplatesForCompany(rawDb, id),
        },

        bookings: {
            list: (params: Omit<Parameters<typeof bookingsRepo.listBookingsPage>[0], "db" | "companyId">) =>
                bookingsRepo.listBookingsPage({ ...params, db, companyId }),
            count: (params: Omit<Parameters<typeof bookingsRepo.countBookingsPage>[0], "db" | "companyId">) =>
                bookingsRepo.countBookingsPage({ ...params, db, companyId }),
            getById: (bookingId: number) =>
                bookingsRepo.getBookingDetailById({ db, bookingId, companyId }),
            createAction: (args: Omit<Parameters<typeof bookingsCreateAction.createBookingAction>[0], "db" | "companyId">) =>
                bookingsCreateAction.createBookingAction({ ...args, db: rawDb, companyId: companyId! }),
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
            newAction: (args: Omit<Parameters<typeof contractsNewAction.handleCreateContractAction>[0], "db">) =>
                contractsNewAction.handleCreateContractAction({ ...args, db: rawDb }),
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
            getCreateData: () =>
                carsCreateRepo.loadCreateCarPageData(rawDb),
            createAction: ({ request, user, formData, assets }: { request: Request; user: SessionUser; formData: FormData; assets: R2Bucket }) => carsCreateAction.handleCreateCarAction({
                request,
                db: rawDb,
                assets,
                user,
                companyId: companyId!,
                formData
            }),
            editAction: ({ request, user, formData, params, assets }: { request: Request; user: SessionUser; formData: FormData; params: any; assets: R2Bucket }) => carsEditAction.handleEditCarAction({
                db: rawDb,
                assets,
                request,
                user,
                params,
                formData
            }),
        },

        companies: {
            list: (params: Omit<Parameters<typeof companiesRepo.listCompaniesPage>[0], "db">) =>
                companiesRepo.listCompaniesPage({ ...params, db }),
            count: (params: Omit<Parameters<typeof companiesRepo.countCompanies>[0], "db">) =>
                companiesRepo.countCompanies({ ...params, db }),
            getById: (id: number) =>
                companiesRepo.getCompanyById({ db, id }),
            getSettings: (id: number) =>
                companiesRepo.getCompanySettings({ db, id }),
            getCreateData: () =>
                companiesCreateRepo.loadCreateCompanyPageData(rawDb),
            handleSettingsAction: (args: Omit<Parameters<typeof settingsActions.handleSettingsAction>[0], "db">) =>
                settingsActions.handleSettingsAction({ ...args, db: rawDb }),
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
            getCreateData: () =>
                paymentsCreateRepo.loadPaymentCreatePageData({ db: rawDb, companyId }),
            createAction: (args: Omit<Parameters<typeof paymentsCreateRepo.createPaymentRecord>[0], "db" | "companyId">) =>
                paymentsCreateRepo.createPaymentRecord({ ...args, db: rawDb, companyId: companyId! }),
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
            },
            getProfileData: (userId: string) =>
                userProfileRepo.loadEditableProfilePageData(rawDb, userId, companyId),
            getProfileUser: (userId: string) =>
                userProfileRepo.loadEditableProfileUser(rawDb, userId, companyId),
            createAction: ({ request, user, formData }: { request: Request; user: SessionUser; formData: FormData }) => userProfileRepo.createManagedUser({
                db: rawDb,
                request,
                actor: { ...user, companyId: companyId ?? undefined },
                formData
            }),
            updateAction: ({ request, user, targetUserId, currentUser, formData, assets }: { request: Request; user: SessionUser; targetUserId: string; currentUser: any; formData: FormData; assets: R2Bucket }) => userProfileRepo.updateManagedUser({
                db: rawDb,
                bucket: assets,
                request,
                actor: { ...user, companyId: companyId ?? undefined },
                targetUserId,
                currentUser,
                formData,
                allowEmailChange: true,
                allowRoleChange: true,
            }),
            deleteAction: ({ request, user, targetUserId, currentUser }: { request: Request; user: SessionUser; targetUserId: string; currentUser: any }) => userProfileRepo.deleteManagedUser({
                db: rawDb,
                request,
                actor: { ...user, companyId: companyId ?? undefined },
                targetUserId,
                currentUser
            }),
        },

        carTemplates: {
            list: () => carTemplatesRepo.loadCarTemplatesData(rawDb),
            handleAction: (args: Omit<Parameters<typeof carTemplatesRepo.handleCarTemplatesAction>[0], "db">) =>
                carTemplatesRepo.handleCarTemplatesAction({ ...args, db: rawDb }),
        },

        auditLogs: {
            list: (options?: { limit?: number; offset?: number }) =>
                analyticsRepo.listAuditLogs(rawDb, { ...options, companyId }),
            count: () =>
                analyticsRepo.countAuditLogs(rawDb, companyId),
            clear: () => analyticsRepo.clearAuditLogs(rawDb, companyId),
            quickAudit: (args: any) => auditLogger.quickAudit({ db: rawDb, ...args }),
        },

        dashboard: {
            getMainData: (u: { id: string; role: any }) =>
                dashboardRepo.loadDashboardHomeData({
                    db: rawDb,
                    user: u,
                    effectiveCompanyId: companyId,
                }),
            deleteTask: (taskId: number) =>
                analyticsRepo.deleteDashboardTask(rawDb, { taskId, companyId }),
        },

        appLayout: {
            getData: (request: Request) =>
                appLayoutRepo.loadAppLayoutData({ request, db: rawDb }),
        },

        calendar: {
            getPageData: (url: URL) =>
                calendarPageRepo.loadCalendarPageData({ db: rawDb, companyId: companyId!, url }),
            getFeed: (url: URL) =>
                calendarPageRepo.loadUpcomingCalendarFeed({ db: rawDb, companyId: companyId!, url }),
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
