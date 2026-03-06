import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const contractId = Number.parseInt(params.id || "0", 10);
    const url = new URL(request.url);
    return redirect(`/contracts/${contractId}/edit${url.search}`);
}

export default function ContractRedirectPage() {
    useUrlToast();
    return null;
}
