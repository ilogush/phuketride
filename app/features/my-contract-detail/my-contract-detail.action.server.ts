import type { D1DatabaseLike } from "~/lib/repo-types.server";
import { requireAuth } from "~/lib/auth.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { submitClientContractReview } from "~/lib/user-self-service.server";

export async function submitMyContractDetailAction(args: {
  db: D1DatabaseLike;
  request: Request;
  contractIdParam: string | undefined;
}) {
  const { db, request, contractIdParam } = args;
  const user = await requireAuth(request);
  const contractId = Number(contractIdParam || 0);

  return trackServerOperation({
    event: "my-contracts.detail.review",
    scope: "route.action",
    request,
    userId: user.id,
    companyId: user.companyId ?? null,
    entityId: contractId,
    details: { route: "my-contracts.$id" },
    run: async () =>
      submitClientContractReview({
        db: db as unknown as D1Database,
        request,
        contractId,
        user,
      }),
  });
}
