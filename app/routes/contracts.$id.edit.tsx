import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireContractAccess } from "~/lib/access-policy.server";
import ContractEditPageView from "~/features/contract-edit/ContractEditPageView";
import { handleEditContractAction } from "~/lib/contracts-edit-action.server";
import { loadEditContractPageData } from "~/lib/contracts-edit-page.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const contractId = parseInt(params.id!);
    const { companyId } = await requireContractAccess(request, context.cloudflare.env.DB, contractId);
    return trackServerOperation({
        event: "contracts.edit.load",
        scope: "route.loader",
        request,
        companyId,
        entityId: contractId,
        details: { route: "contracts.$id.edit" },
        run: () => loadEditContractPageData(context.cloudflare.env.DB, contractId, companyId),
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { user, companyId } = await requireContractAccess(request, context.cloudflare.env.DB, Number(params.id));
    const formData = await request.formData();
    return trackServerOperation({
        event: "contracts.edit",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        entityId: Number(params.id),
        details: { route: "contracts.$id.edit" },
        run: async () => handleEditContractAction({ request, context, user, companyId, params, formData }),
    });
}

export default function EditContract() {
    const data = useLoaderData<typeof loader>();
    useUrlToast();
    return <ContractEditPageView {...data} />;
}
