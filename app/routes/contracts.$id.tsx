import { type LoaderFunctionArgs, redirect } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const contractId = Number.parseInt(params.id || "0", 10);
    const { sdb } = await getScopedDb(request, context);
    const contract = await sdb.contracts.getDetail(contractId);
    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }
    const url = new URL(request.url);
    return redirect(`/contracts/${contractId}/edit${url.search}`);
}

export default function ContractRedirectPage() {
    return null;
}
