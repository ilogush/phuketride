import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { useUrlToast } from "~/lib/useUrlToast";

interface CarAccessRow {
    id: number;
    companyId: number;
}

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const carId = Number(params.id);
    const url = new URL(request.url);
    const modCompanyId = url.searchParams.get("modCompanyId");

    const car = (await context.cloudflare.env.DB
        .prepare("SELECT id, company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1")
        .bind(carId)
        .first()) as CarAccessRow | null;

    if (!car) {
        throw new Response("Car not found", { status: 404 });
    }

    if (user.role !== "admin" && car.companyId !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    const editUrl = modCompanyId
        ? `/cars/${carId}/edit?modCompanyId=${modCompanyId}`
        : `/cars/${carId}/edit`;
    return redirect(editUrl);
}

export default function CarDetailsRedirectPage() {
    useUrlToast();
    return null;
}
