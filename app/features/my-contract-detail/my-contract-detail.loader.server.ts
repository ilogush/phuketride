import type { D1DatabaseLike } from "~/lib/repo-types.server";
import { requireAuth } from "~/lib/auth.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadClientContractDetailPage } from "~/lib/user-self-service.server";

export async function loadMyContractDetailPage(args: {
  db: D1DatabaseLike;
  request: Request;
  contractIdParam: string | undefined;
}) {
  const { db, request, contractIdParam } = args;
  const user = await requireAuth(request);
  const contractId = Number(contractIdParam || 0);

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
        db: db as unknown as D1Database,
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
