import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import MyContractsPageView from "~/features/my-contracts/MyContractsPageView";
import { loadMyContractsPage } from "~/features/my-contracts/my-contracts.loader.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context }: LoaderFunctionArgs) {
    return loadMyContractsPage({
        db: context.cloudflare.env.DB,
        request,
    });
}

export default function MyContractsPage() {
    const data = useLoaderData<typeof loader>();
    useUrlToast();
    return <MyContractsPageView {...data} />;
}
