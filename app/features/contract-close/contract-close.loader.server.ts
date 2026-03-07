import { requireContractAccess } from "~/lib/access-policy.server";
import { getClosableContractById } from "~/lib/contracts-repo.server";

export type CloseContractViewData = {
  contract: {
    id: number;
    companyId: number;
    company_car_id: number;
    client_id: string | null;
    start_date: string;
    end_date: string;
    start_mileage: number | null;
    fuel_level: string | null;
    cleanliness: string | null;
    brandName: string | null;
    modelName: string | null;
    clientName: string | null;
    clientSurname: string | null;
    startDate: string;
    endDate: string;
    startMileage: number | null;
    fuelLevel: string | null;
    companyCar: {
      id: number;
      companyId: number;
      template: {
        brand: { name: string | null };
        model: { name: string | null };
      };
    };
    client: {
      name: string | null;
      surname: string | null;
    };
  };
};

export async function loadContractClosePage(args: {
  db: D1Database;
  request: Request;
  contractIdParam: string | undefined;
}): Promise<CloseContractViewData> {
  const { db, request, contractIdParam } = args;
  const contractId = Number(contractIdParam);

  await requireContractAccess(request, db, contractId);

  const contract = await getClosableContractById({ db, contractId });
  if (!contract) {
    throw new Response("Contract not found", { status: 404 });
  }

  return {
    contract: {
      ...contract,
      startDate: contract.start_date,
      endDate: contract.end_date,
      startMileage: contract.start_mileage,
      fuelLevel: contract.fuel_level,
      companyCar: {
        id: contract.company_car_id,
        companyId: contract.companyId,
        template: {
          brand: { name: contract.brandName },
          model: { name: contract.modelName },
        },
      },
      client: {
        name: contract.clientName,
        surname: contract.clientSurname,
      },
    },
  };
}
