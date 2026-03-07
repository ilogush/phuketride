import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import BackButton from "~/components/dashboard/BackButton";
import MyContractDetailsCards from "~/components/dashboard/contracts/MyContractDetailsCards";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadClientContractDetailPage, submitClientContractReview } from "~/lib/user-self-service.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const contractId = Number(params.id || 0);
    if (!Number.isFinite(contractId) || contractId <= 0) {
        throw new Response("Contract ID is required", { status: 400 });
    }

    return trackServerOperation({
        event: "my-contracts.detail.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: user.companyId ?? null,
        entityId: contractId,
        details: { route: "my-contracts.$id" },
        run: async () => {
            const result = await loadClientContractDetailPage({
                db: context.cloudflare.env.DB,
                contractId,
                userId: user.id,
            });
            if (!result) {
                throw new Response("Contract not found", { status: 404 });
            }
            return result;
        },
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const contractId = Number(params.id || 0);

    return trackServerOperation({
        event: "my-contracts.detail.review",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: user.companyId ?? null,
        entityId: contractId,
        details: { route: "my-contracts.$id" },
        run: async () => submitClientContractReview({
            db: context.cloudflare.env.DB,
            request,
            contractId,
            user,
        }),
    });
}

export default function ContractDetails() {
    useUrlToast();
    const { contract, payments, existingReview, canLeaveReview } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <BackButton to="/my-contracts" />
            <MyContractDetailsCards
                contract={contract}
                payments={payments}
                existingReview={existingReview}
                canLeaveReview={canLeaveReview}
            />
        </div>
    );
}
