import type { SessionUser } from "~/lib/auth.server";
import { hashPassword } from "~/lib/password.server";
import type { PartnerRegistrationInput, UserRegistrationInput } from "~/schemas/registration";

export type RegistrationResult =
    | {
          ok: true;
          sessionUser: SessionUser;
      }
    | {
          ok: false;
          error: string;
      };

export type ActiveDistrictRow = {
    id: number;
    name: string;
};

async function emailExists(db: D1Database, email: string) {
    const existing = await db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).all();
    return (existing.results?.length ?? 0) > 0;
}

function isUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes("unique") || message.includes("constraint");
}

export async function loadActivePhuketDistricts(db: D1Database): Promise<ActiveDistrictRow[]> {
    const result = await db
        .prepare(
            `
            SELECT id, name
            FROM districts
            WHERE location_id = 1 AND is_active = 1
            ORDER BY name
            `
        )
        .all();

    return (result.results ?? []) as ActiveDistrictRow[];
}

export async function registerUserAccount(args: {
    db: D1Database;
    input: UserRegistrationInput;
}): Promise<RegistrationResult> {
    const { email, password, firstName, lastName, phone } = args.input;
    if (await emailExists(args.db, email)) {
        return { ok: false, error: "Unable to create account" };
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = Date.now();

    try {
        await args.db
            .prepare(
                `
                INSERT INTO users (
                    id, email, role, name, surname, phone, password_hash, created_at, updated_at
                ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
                `
            )
            .bind(id, email, firstName, lastName, phone, passwordHash, now, now)
            .run();
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { ok: false, error: "Unable to create account" };
        }
        throw error;
    }

    return {
        ok: true,
        sessionUser: {
            id,
            email,
            role: "user",
            name: firstName,
            surname: lastName,
        },
    };
}

export async function registerPartnerAccount(args: {
    db: D1Database;
    input: PartnerRegistrationInput;
}): Promise<RegistrationResult> {
    const { email, password, name, surname, phone, telegram, companyName, districtId, street, houseNumber } =
        args.input;
    if (await emailExists(args.db, email)) {
        return { ok: false, error: "Unable to create account" };
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = Date.now();

    try {
        await args.db.batch([
            args.db
                .prepare(
                    `INSERT INTO users (id, email, role, name, surname, phone, telegram, password_hash, is_first_login, created_at, updated_at)
                     VALUES (?, ?, 'partner', ?, ?, ?, ?, ?, 1, ?, ?)`
                )
                .bind(userId, email, name, surname, phone, telegram || null, passwordHash, now, now),
            args.db
                .prepare(
                    `INSERT INTO companies (name, owner_id, email, phone, telegram, location_id, district_id, street, house_number, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
                )
                .bind(companyName, userId, email, phone, telegram || null, districtId, street, houseNumber, now, now),
        ]);
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { ok: false, error: "Unable to create account" };
        }
        throw error;
    }

    const company = (await args.db
        .prepare("SELECT id FROM companies WHERE owner_id = ? LIMIT 1")
        .bind(userId)
        .first()) as { id: number } | null;

    return {
        ok: true,
        sessionUser: {
            id: userId,
            email,
            role: "partner",
            name,
            surname,
            companyId: company?.id,
        },
    };
}
