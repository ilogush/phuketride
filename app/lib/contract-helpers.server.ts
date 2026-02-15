// Contract calculation helpers
import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "~/db/schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Calculate amount paid for a contract from payments
 * Returns sum of (amount * sign) where sign is +1 or -1
 */
export async function calculateAmountPaid(
    db: DbType,
    contractId: number
): Promise<number> {
    const result = await db
        .select({
            total: sql<number>`
                COALESCE(
                    SUM(
                        CASE 
                            WHEN ${schema.paymentTypes.sign} = '+' THEN ${schema.payments.amount}
                            WHEN ${schema.paymentTypes.sign} = '-' THEN -${schema.payments.amount}
                            ELSE 0
                        END
                    ),
                    0
                )
            `
        })
        .from(schema.payments)
        .innerJoin(schema.paymentTypes, eq(schema.payments.paymentTypeId, schema.paymentTypes.id))
        .where(
            and(
                eq(schema.payments.contractId, contractId),
                eq(schema.payments.status, 'completed')
            )
        );

    return result[0]?.total || 0;
}

/**
 * Get contract with calculated amount_paid
 */
export async function getContractWithAmountPaid(
    db: DbType,
    contractId: number
) {
    const contract = await db.query.contracts.findFirst({
        where: (c, { eq }) => eq(c.id, contractId),
        with: {
            payments: {
                with: {
                    paymentType: {
                        columns: { sign: true }
                    }
                },
                where: (p, { eq }) => eq(p.status, 'completed')
            }
        }
    });

    if (!contract) return null;

    const amountPaid = contract.payments.reduce((sum: number, payment: any) => {
        const multiplier = payment.paymentType.sign === '+' ? 1 : -1;
        return sum + (payment.amount * multiplier);
    }, 0);

    return {
        ...contract,
        amountPaid
    };
}

/**
 * Update car status based on contract status
 */
export async function updateCarStatus(
    db: DbType,
    carId: number,
    status: 'available' | 'rented' | 'booked' | 'maintenance',
    reason: string
): Promise<void> {
    await db.update(schema.companyCars)
        .set({ 
            status,
            updatedAt: new Date()
        })
        .where(eq(schema.companyCars.id, carId));
}
