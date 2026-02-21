import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const carId = Number(params.id);

    const car = await db.query.companyCars.findFirst({
        where: eq(schema.companyCars.id, carId),
    });

    if (!car) {
        throw new Response("Car not found", { status: 404 });
    }

    if (user.role !== "admin" && car.companyId !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    return redirect(`/cars/${carId}/edit`);
}

export default function CarDetailsRedirectPage() {
    return null;
}
