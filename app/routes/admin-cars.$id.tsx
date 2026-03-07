import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireCarAccess } from "~/lib/cars-content.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const carId = Number(params.id);
    const url = new URL(request.url);
    const modCompanyId = url.searchParams.get("modCompanyId");
    await requireCarAccess(request, context, carId);

    const editUrl = modCompanyId
        ? `/cars/${carId}/edit?modCompanyId=${modCompanyId}`
        : `/cars/${carId}/edit`;
    return redirect(editUrl);
}

export default function CarDetailsRedirectPage() {
    useUrlToast();
    return null;
}
