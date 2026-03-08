import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import ContractClosePageView from "~/features/contract-close/ContractClosePageView";
import { submitContractCloseAction } from "~/features/contract-close/contract-close.action.server";
import { loadContractClosePage } from "~/features/contract-close/contract-close.loader.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    return loadContractClosePage({
        db: context.cloudflare.env.DB,
        request,
        contractIdParam: params.id,
    });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
    return submitContractCloseAction({
        db: context.cloudflare.env.DB,
        request,
        contractIdParam: params.id,
    });
}

export default function CloseContract() {
    const { contract } = useLoaderData<typeof loader>();
    return <ContractClosePageView contract={contract} />;
}
