import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";
import ContractEditPageView from "~/features/contract-edit/ContractEditPageView";
import { loadEditContractPageData } from "~/lib/contracts-edit-page.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const contractId = parseInt(params.id!);
    const { sdb, companyId } = await getScopedDb(request, context);
    return trackServerOperation({
        event: "contracts.edit.load",
        scope: "route.loader",
        request,
        companyId,
        entityId: contractId,
        details: { route: "contracts.$id.edit" },
        run: () => loadEditContractPageData(sdb, contractId),
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const formData = await request.formData();
    return trackServerOperation({
        event: "contracts.edit",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        entityId: Number(params.id),
        details: { route: "contracts.$id.edit" },
        run: async () => sdb.contracts.editAction({
            assets: context.cloudflare.env.ASSETS,
            request,
            user,
            params,
            formData
        }),
    });
}

export default function EditContract() {
    const data = useLoaderData<typeof loader>();
    useUrlToast();
    return <ContractEditPageView {...data} />;
}
