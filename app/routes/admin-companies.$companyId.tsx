import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const companyId = Number.parseInt(params.companyId || "0", 10);
    return redirect(`/home?modCompanyId=${companyId}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = Number.parseInt(params.companyId || "0", 10);

    if (user.role !== "admin") {
        return redirectWithError(`/home?modCompanyId=${companyId}`, "Access denied");
    }

    const formData = await request.formData();
    const parsed = parseWithSchema(
        z
        .object({
            intent: z.enum(["archive", "unarchive"]),
        }),
        {
            intent: formData.get("intent"),
        },
        "Invalid action"
    );
    if (!parsed.ok) {
        return redirectWithError(`/home?modCompanyId=${companyId}`, "Invalid action");
    }
    const intent = parsed.data.intent;

    if (intent === "archive") {
        const { archiveCompany } = await import("~/lib/archive.server");
        const result = await archiveCompany(context.cloudflare.env.DB, companyId);

        if (result.success) {
            return redirectWithSuccess("/companies", result.message || "Company archived successfully");
        }

        return redirectWithError(`/home?modCompanyId=${companyId}`, result.message || result.error || "Failed to archive company");
    }

    if (intent === "unarchive") {
        const { unarchiveCompany } = await import("~/lib/archive.server");
        const result = await unarchiveCompany(context.cloudflare.env.DB, companyId);

        if (result.success) {
            return redirectWithSuccess(`/home?modCompanyId=${companyId}`, result.message || "Company unarchived successfully");
        }

        return redirectWithError(`/home?modCompanyId=${companyId}`, result.message || result.error || "Failed to unarchive company");
    }

    return redirect(`/home?modCompanyId=${companyId}`);
}

export default function CompanyRedirectPage() {
    return null;
}
