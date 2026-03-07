import { type LoaderFunctionArgs, redirect } from "react-router";
import { requireContractAccess } from "~/lib/access-policy.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const contractId = Number.parseInt(params.id || "0", 10);
    await requireContractAccess(request, context.cloudflare.env.DB, contractId);
    const url = new URL(request.url);
    return redirect(`/contracts/${contractId}/edit${url.search}`);
}

export default function ContractRedirectPage() {
    useUrlToast();
    return null;
}
