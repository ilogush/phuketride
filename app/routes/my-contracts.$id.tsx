import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import MyContractDetailPageView from "~/features/my-contract-detail/MyContractDetailPageView";
import { submitMyContractDetailAction } from "~/features/my-contract-detail/my-contract-detail.action.server";
import { loadMyContractDetailPage } from "~/features/my-contract-detail/my-contract-detail.loader.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    return loadMyContractDetailPage({
        db: context.cloudflare.env.DB,
        request,
        contractIdParam: params.id,
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    return submitMyContractDetailAction({
        db: context.cloudflare.env.DB,
        request,
        contractIdParam: params.id,
    });
}

export default function ContractDetails() {
    const data = useLoaderData<typeof loader>();
    useUrlToast();
    return <MyContractDetailPageView {...data} />;
}
