import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { redirectWithRequestError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await getScopedDb(request, context, requireAdminUserMutationAccess);
    const companyId = Number.parseInt(params.companyId || "0", 10);
    return redirect(`/home?modCompanyId=${companyId}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { user, companyId: currentCompanyId, sdb } = await getScopedDb(request, context, requireAdminUserMutationAccess);
    const companyId = Number.parseInt(params.companyId || "0", 10);

    const formData = await request.formData();
    const parsed = parseWithSchema(
        z
        .object({
            intent: z.enum(["archive", "unarchive"] as const),
        }),
        {
            intent: formData.get("intent"),
        },
        "Invalid action"
    );
    if (!parsed.ok) {
        return redirectWithRequestError(request, `/home?modCompanyId=${companyId}`, "Invalid action");
    }
    const intent = parsed.data.intent;

    if (intent === "archive") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                const { archiveCompany } = await import("~/lib/archive.server");
                const result = await archiveCompany(db, companyId);
                if (!result.success) throw new Error(result.error);
            },
            feedback: {
                successPath: "/companies",
                successMessage: "Company archived successfully",
                errorMessage: "Failed to archive company",
            },
            audit: {
                entityType: "company",
                entityId: companyId,
                action: "delete",
            },
        });
    }

    if (intent === "unarchive") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                const { unarchiveCompany } = await import("~/lib/archive.server");
                const result = await unarchiveCompany(db, companyId);
                if (!result.success) throw new Error(result.error);
            },
            feedback: {
                successPath: `/home?modCompanyId=${companyId}`,
                successMessage: "Company unarchived successfully",
                errorMessage: "Failed to unarchive company",
            },
            audit: {
                entityType: "company",
                entityId: companyId,
                action: "update", // unarchive is an update
            },
        });
    }

    return redirectWithRequestError(request, `/home?modCompanyId=${companyId}`, "Invalid action");
}

export default function CompanyRedirectPage() {
    useUrlToast();
    return null;
}
