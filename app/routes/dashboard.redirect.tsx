import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
    await requireAuth(request);
    const rest = params["*"] ?? "";
    const url = new URL(request.url);
    const query = url.search;

    if (!rest) {
        return redirect(`/dashboard${query}`);
    }

    return redirect(`/${rest}${query}`);
}

export default function DashboardPathRedirect() {
    return null;
}
