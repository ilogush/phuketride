// Security helpers for multi-tenancy validation
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "~/db/schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Verify that a car belongs to the user's company
 * Throws error if validation fails
 */
export async function validateCarOwnership(
    db: DbType,
    carId: number,
    companyId: number
): Promise<void> {
    const car = await db.query.companyCars.findFirst({
        where: (cars, { eq, and }) => and(
            eq(cars.id, carId),
            eq(cars.companyId, companyId)
        ),
        columns: { id: true }
    });

    if (!car) {
        throw new Error("Car not found or doesn't belong to your company");
    }
}

/**
 * Verify that a contract belongs to the user's company
 */
export async function validateContractOwnership(
    db: DbType,
    contractId: number,
    companyId: number
): Promise<void> {
    const contract = await db.query.contracts.findFirst({
        where: (c, { eq }) => eq(c.id, contractId),
        with: {
            companyCar: {
                columns: { companyId: true }
            }
        }
    });

    if (!contract || contract.companyCar.companyId !== companyId) {
        throw new Error("Contract not found or doesn't belong to your company");
    }
}

/**
 * Get company clients (users who have contracts with this company)
 */
export async function getCompanyClients(
    db: DbType,
    companyId: number
) {
    const clients = await db
        .selectDistinct({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            surname: schema.users.surname,
            phone: schema.users.phone,
            role: schema.users.role,
        })
        .from(schema.users)
        .innerJoin(schema.contracts, eq(schema.users.id, schema.contracts.clientId))
        .innerJoin(schema.companyCars, eq(schema.contracts.companyCarId, schema.companyCars.id))
        .where(
            and(
                eq(schema.companyCars.companyId, companyId),
                eq(schema.users.role, "user")
            )
        )
        .limit(100);

    return clients;
}
