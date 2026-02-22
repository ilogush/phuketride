import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const carId = Number(params.id);

    const car = await context.cloudflare.env.DB
        .prepare("SELECT id, company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1")
        .bind(carId)
        .first<{ id: number; companyId: number }>();

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
