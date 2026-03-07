import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAdminUserMutationAccess(request);
    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const url = new URL(request.url);
    return redirect(`/users/${userId}/edit${url.search}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAdminUserMutationAccess(request);
    const userId = params.userId;

    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
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
        return redirectWithError(`/users/${userId}/edit`, "Invalid action");
    }
    const intent = parsed.data.intent;

    if (intent === "archive") {
        const { archiveUser } = await import("~/lib/archive.server");
        const result = await archiveUser(context.cloudflare.env.DB, userId);

        if (result.success) {
            return redirectWithSuccess("/users", result.message || "User archived successfully");
        }

        return redirectWithError(`/users/${userId}/edit`, result.message || result.error || "Failed to archive user");
    }

    if (intent === "unarchive") {
        const { unarchiveUser } = await import("~/lib/archive.server");
        const result = await unarchiveUser(context.cloudflare.env.DB, userId);

        if (result.success) {
            return redirectWithSuccess(`/users/${userId}/edit`, result.message || "User unarchived successfully");
        }

        return redirectWithError(`/users/${userId}/edit`, result.message || result.error || "Failed to unarchive user");
    }

    return redirect(`/users/${userId}/edit`);
}

export default function UserRedirectPage() {
    useUrlToast();
    return null;
}
