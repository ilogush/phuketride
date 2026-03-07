import { requireAuth } from "~/lib/auth.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadClientRentalHistoryPage } from "~/lib/user-self-service.server";

export interface MyContractRow {
  id: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCurrency: string;
  status: "active" | "closed";
  createdAt: string;
  carLicensePlate: string;
  carYear: number;
  brandName: string | null;
  modelName: string | null;
}

export async function loadMyContractsPage(args: {
  db: D1Database;
  request: Request;
}) {
  const { db, request } = args;
  const user = await requireAuth(request);
  const url = new URL(request.url);

  return trackServerOperation({
    event: "my-contracts.load",
    scope: "route.loader",
    request,
    userId: user.id,
    companyId: user.companyId ?? null,
    details: { route: "my-contracts" },
    run: async () => {
      const { rows, totalPages, currentPage, status } = await loadClientRentalHistoryPage({
        db,
        userId: user.id,
        url,
        includeColor: false,
      });
      return {
        contracts: rows as MyContractRow[],
        totalPages,
        currentPage,
        status,
      };
    },
  });
}
