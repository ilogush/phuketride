import { type SessionUser, requireAdmin } from "~/lib/auth.server";
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

type AdminRouteContext = {
    cloudflare: {
        env: {
            DB: D1Database;
        };
    };
};

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

export async function requireAdminDb(
    request: Request,
    context: AdminRouteContext
): Promise<{ user: SessionUser; db: D1Database }> {
    const user = await requireAdmin(request);
    return { user, db: context.cloudflare.env.DB };
}

export async function loadAdminPageData<TLoaders extends AdminPageLoaderMap>(params: {
    request: Request;
    context: AdminRouteContext;
    loaders: TLoaders;
}): Promise<{ user: SessionUser } & ResolvedAdminPageData<TLoaders>> {
    const { request, context, loaders } = params;
    const { user, db } = await requireAdminDb(request, context);

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
    mutate: (args: { db: D1Database; user: SessionUser }) => Promise<void>;
    feedback: MutationFeedbackOptions;
    audit?: AdminMutationAudit;
}) {
    const { request, context, mutate, feedback, audit } = params;
    const { user, db } = await requireAdminDb(request, context);

    return runMutationWithFeedback(
        async () => {
            await mutate({ db, user });

            if (audit) {
                await quickAudit({
                    db,
                    userId: user.id,
                    role: user.role,
                    companyId: user.companyId,
                    entityType: audit.entityType,
                    entityId: audit.entityId,
                    action: audit.action,
                    beforeState: audit.beforeState,
                    afterState: audit.afterState,
                    ...getRequestMetadata(request),
                });
            }
        },
        feedback
    );
}
