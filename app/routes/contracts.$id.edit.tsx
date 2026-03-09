import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";
import ContractEditPageView from "~/features/contract-edit/ContractEditPageView";
import { loadContractEditPageData } from "~/features/contract-edit/contract-edit.loader.server";
import { submitContractEditAction } from "~/features/contract-edit/contract-edit.action.server";
import { trackServerOperation } from "~/lib/telemetry.server";

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
        run: () => loadContractEditPageData({ sdb, contractId }),
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
        run: async () => submitContractEditAction({
            db: context.cloudflare.env.DB,
            assets: context.cloudflare.env.ASSETS,
            request,
            user,
            params,
            formData,
            companyId,
        }),
    });
}

export default function EditContract() {
    const data = useLoaderData<typeof loader>();
    return <ContractEditPageView {...data} />;
}
