export type UserRole = "admin" | "partner" | "manager" | "user";

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name: string | null;
    surname: string | null;
    phone: string | null;
    companyId?: number;
}

export interface SessionUser extends User {
    companyId?: number;
}
