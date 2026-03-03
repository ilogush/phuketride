import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const companyId = Number.parseInt(params.companyId || "0", 10);
    const url = new URL(request.url);
    return redirect(`/companies/${companyId}/edit${url.search}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = Number.parseInt(params.companyId || "0", 10);

    if (user.role !== "admin") {
        return redirect(`/companies/${companyId}/edit?error=Access denied`);
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "archive") {
        const { archiveCompany } = await import("~/lib/archive.server");
        const result = await archiveCompany(context.cloudflare.env.DB, companyId);

        if (result.success) {
            return redirect(`/companies?success=${encodeURIComponent(result.message || "Company archived successfully")}`);
        }

        return redirect(`/companies/${companyId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to archive company")}`);
    }

    if (intent === "unarchive") {
        const { unarchiveCompany } = await import("~/lib/archive.server");
        const result = await unarchiveCompany(context.cloudflare.env.DB, companyId);

        if (result.success) {
            return redirect(`/companies/${companyId}/edit?success=${encodeURIComponent(result.message || "Company unarchived successfully")}`);
        }

        return redirect(`/companies/${companyId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to unarchive company")}`);
    }

    return redirect(`/companies/${companyId}/edit`);
}

export default function CompanyRedirectPage() {
    return null;
}
