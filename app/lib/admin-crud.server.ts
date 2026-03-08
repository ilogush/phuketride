import { type SessionUser } from "~/lib/auth.server";
import {
    getRequestMetadata,
    quickAudit,
    type AuditAction,
    type EntityType,
} from "~/lib/audit-logger";
import {
    runMutationWithFeedback,
    type MutationFeedbackOptions,
} from "~/lib/admin-actions";
import {
    invalidateEntityCache,
    type INVALIDATION_RULES,
} from "~/lib/cache-invalidation.server";
import type { AppLoadContext } from "~/types/context";

type AdminRouteContext = AppLoadContext;

type AdminPageLoaderMap = Record<string, (db: D1Database) => Promise<unknown>>;

type ResolvedAdminPageData<TLoaders extends AdminPageLoaderMap> = {
    [K in keyof TLoaders]: Awaited<ReturnType<TLoaders[K]>>;
};

type AdminMutationAudit =
    | {
        entityType: EntityType;
        action: AuditAction;
        entityId?: number | string;
        beforeState?: unknown;
        afterState?: unknown;
    }
    | undefined;

type AdminMutationCache = {
    invalidate?: Array<keyof typeof INVALIDATION_RULES>;
};

import { getScopedDb } from "~/lib/db-factory.server";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";

export async function requireAdminDb(
    request: Request,
    context: AdminRouteContext
): Promise<{ user: SessionUser; db: D1Database; companyId: number | null }> {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireAdminUserMutationAccess);
    return { user, db: sdb.db, companyId };
}

export async function loadAdminPageData<TLoaders extends AdminPageLoaderMap>(params: {
    request: Request;
    context: AdminRouteContext;
    loaders: TLoaders;
    db?: D1Database;
}): Promise<{ user: SessionUser } & ResolvedAdminPageData<TLoaders>> {
    const { request, context, loaders, db: providedDb } = params;
    const { user, db: factoryDb } = await requireAdminDb(request, context);
    const db = providedDb || factoryDb;

    const entries = await Promise.all(
        Object.entries(loaders).map(async ([key, loader]) => [key, await loader(db)] as const)
    );

    return {
        user,
        ...(Object.fromEntries(entries) as ResolvedAdminPageData<TLoaders>),
    };
}

export async function runAdminMutationAction(params: {
    request: Request;
    context: AdminRouteContext;
    mutate: (args: { db: D1Database; user: SessionUser; companyId: number | null }) => Promise<void>;
    feedback: MutationFeedbackOptions;
    audit?: AdminMutationAudit;
    cache?: AdminMutationCache;
}) {
    const { request, context, mutate, feedback, audit, cache } = params;
    const { user, db, companyId } = await requireAdminDb(request, context);

    return runMutationWithFeedback(
        request,
        async () => {
            await mutate({ db, user, companyId });

            if (audit) {
                await quickAudit({
                    db,
                    userId: user.id,
                    role: user.role,
                    companyId: companyId,
                    entityType: audit.entityType,
                    entityId: audit.entityId,
                    action: audit.action,
                    beforeState: audit.beforeState,
                    afterState: audit.afterState,
                    ...getRequestMetadata(request),
                });
            }

            // Invalidate cache after successful mutation
            if (cache?.invalidate) {
                cache.invalidate.forEach((entityType) => {
                    invalidateEntityCache(entityType);
                });
            }
        },
        feedback
    );
}
