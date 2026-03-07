import { z } from "zod";

import { requireContractAccess } from "~/lib/access-policy.server";
import { parseDateTimeFromDisplay } from "~/lib/formatters";
import { closeContractAction } from "~/lib/contracts-close-action.server";
import { redirectWithRequestError } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";

export async function submitContractCloseAction(args: {
  db: D1Database;
  request: Request;
  contractIdParam: string | undefined;
}) {
  const { db, request, contractIdParam } = args;
  const contractId = Number(contractIdParam);
  const { user, companyId } = await requireContractAccess(request, db, contractId);

  return trackServerOperation({
    event: "contracts.close",
    scope: "route.action",
    request,
    userId: user.id,
    companyId,
    entityId: contractId,
    details: { route: "contracts_.$id.close" },
    run: async () => {
      const formData = await request.formData();
      const parsedEnvelope = parseWithSchema(
        z.object({
          actualEndDate: z.string().trim().min(1, "Actual end date is required"),
          endMileage: z.coerce.number().min(0, "End mileage is required"),
          fuelLevel: z.string().trim().min(1, "Fuel level is required"),
          cleanliness: z.string().trim().min(1, "Cleanliness is required"),
        }),
        {
          actualEndDate: formData.get("actualEndDate"),
          endMileage: formData.get("endMileage"),
          fuelLevel: formData.get("fuelLevel"),
          cleanliness: formData.get("cleanliness"),
        },
        "Invalid close contract form",
      );

      if (!parsedEnvelope.ok) {
        return redirectWithRequestError(
          request,
          `/contracts/${contractId}/close`,
          parsedEnvelope.error,
        );
      }

      return closeContractAction({
        db,
        request,
        user,
        companyId,
        contractId,
        actualEndDate: new Date(
          parseDateTimeFromDisplay(parsedEnvelope.data.actualEndDate),
        ),
        endMileage: parsedEnvelope.data.endMileage,
        fuelLevel: parsedEnvelope.data.fuelLevel,
        cleanliness: parsedEnvelope.data.cleanliness,
        notes: (formData.get("notes") as string) || null,
      });
    },
  });
}
