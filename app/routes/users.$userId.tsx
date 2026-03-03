import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const url = new URL(request.url);
    return redirect(`/users/${userId}/edit${url.search}`);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const userId = params.userId;

    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    if (sessionUser.role !== "admin") {
        return redirect(`/users/${userId}/edit?error=Access denied`);
    }

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "archive") {
        const { archiveUser } = await import("~/lib/archive.server");
        const result = await archiveUser(context.cloudflare.env.DB, userId);

        if (result.success) {
            return redirect(`/users?success=${encodeURIComponent(result.message || "User archived successfully")}`);
        }

        return redirect(`/users/${userId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to archive user")}`);
    }

    if (intent === "unarchive") {
        const { unarchiveUser } = await import("~/lib/archive.server");
        const result = await unarchiveUser(context.cloudflare.env.DB, userId);

        if (result.success) {
            return redirect(`/users/${userId}/edit?success=${encodeURIComponent(result.message || "User unarchived successfully")}`);
        }

        return redirect(`/users/${userId}/edit?error=${encodeURIComponent(result.message || result.error || "Failed to unarchive user")}`);
    }

    return redirect(`/users/${userId}/edit`);
}

export default function UserRedirectPage() {
    return null;
}
