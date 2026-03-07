import { requireAuth, type SessionUser } from "~/lib/auth.server";
import { getUserNotificationsCount, getUserNotificationWindows } from "~/lib/user-notifications.server";

type SessionUserSnapshot = Pick<SessionUser, "avatarUrl" | "name" | "surname">;

export interface AppLayoutData {
    user: SessionUser;
    notificationsCount: number;
}

async function loadSessionUserSnapshot(db: D1Database, userId: string): Promise<SessionUserSnapshot | null> {
    return await db
        .prepare(`
            SELECT
                avatar_url AS avatarUrl,
                name,
                surname
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first<SessionUserSnapshot | null>();
}

function mergeSessionUser(sessionUser: SessionUser, snapshot: SessionUserSnapshot | null): SessionUser {
    if (!snapshot) {
        return sessionUser;
    }

    return {
        ...sessionUser,
        avatarUrl: snapshot.avatarUrl ?? sessionUser.avatarUrl ?? null,
        name: snapshot.name ?? sessionUser.name,
        surname: snapshot.surname ?? sessionUser.surname,
    };
}

async function loadNotificationsCount(db: D1Database, user: SessionUser) {
    if (user.role !== "user") {
        return 0;
    }

    const windows = getUserNotificationWindows();
    return await getUserNotificationsCount(db, user.id, windows);
}

export async function loadAppLayoutData(args: {
    request: Request;
    db: D1Database;
}): Promise<AppLayoutData> {
    const sessionUser = await requireAuth(args.request);

    let user = sessionUser;
    try {
        user = mergeSessionUser(sessionUser, await loadSessionUserSnapshot(args.db, sessionUser.id));
    } catch {
        user = sessionUser;
    }

    try {
        const notificationsCount = await loadNotificationsCount(args.db, user);
        return { user, notificationsCount };
    } catch {
        return { user, notificationsCount: 0 };
    }
}
