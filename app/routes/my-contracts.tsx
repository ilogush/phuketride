import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import MyContractsPageView from "~/features/my-contracts/MyContractsPageView";
import { loadMyContractsPage } from "~/features/my-contracts/my-contracts.loader.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    return loadMyContractsPage({
        db: context.cloudflare.env.DB,
        request,
    });
}

export default function MyContractsPage() {
    const data = useLoaderData<typeof loader>();
    return <MyContractsPageView {...data} />;
}
