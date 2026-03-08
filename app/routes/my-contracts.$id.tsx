import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import MyContractDetailPageView from "~/features/my-contract-detail/MyContractDetailPageView";
import { submitMyContractDetailAction } from "~/features/my-contract-detail/my-contract-detail.action.server";
import { loadMyContractDetailPage } from "~/features/my-contract-detail/my-contract-detail.loader.server";
import { requireAuthAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { sdb } = await getScopedDb(request, context, requireAuthAccess);
    return loadMyContractDetailPage({
        db: sdb.db,
        request,
        contractIdParam: params.id,
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { sdb } = await getScopedDb(request, context, requireAuthAccess);
    return submitMyContractDetailAction({
        db: sdb.db,
        request,
        contractIdParam: params.id,
    });
}

export default function ContractDetails() {
    const data = useLoaderData<typeof loader>();
    return <MyContractDetailPageView {...data} />;
}
