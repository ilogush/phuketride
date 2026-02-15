import { type LoaderFunctionArgs, redirect } from "react-router";

export async function loader({ params, request }: LoaderFunctionArgs) {
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
