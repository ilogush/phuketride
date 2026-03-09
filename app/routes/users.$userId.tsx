import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";

export const meta: MetaFunction = () => [
    { title: "User Profile — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { assertSameOriginMutation } from "~/lib/request-security.server";

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
    assertSameOriginMutation(request);
    await requireAdminUserMutationAccess(request);
    const userId = params.userId;

    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const formData = await request.formData();
    const parsed = parseWithSchema(
        z
        .object({
            intent: z.enum(["archive", "unarchive"] as const),
        }),
        {
            intent: formData.get("intent"),
    });
    if (!parsed.ok) {
        return redirectWithRequestError(request, `/users/${userId}/edit`, "Invalid action");
    }
    const intent = parsed.data.intent;

    if (intent === "archive") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                const { archiveUser } = await import("~/lib/archive.server");
                const result = await archiveUser(db, userId);
                if (!result.success) throw new Error(result.error);
            },
            feedback: {
                successPath: "/users",
                successMessage: "User archived successfully",
                errorMessage: "Failed to archive user",
            },
            audit: {
                entityType: "user",
                entityId: Number(userId) || 0, // audit expects number id if possible, but user id is string (UUID)
                action: "delete",
            },
        });
    }

    if (intent === "unarchive") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                const { unarchiveUser } = await import("~/lib/archive.server");
                const result = await unarchiveUser(db, userId);
                if (!result.success) throw new Error(result.error);
            },
            feedback: {
                successPath: `/users/${userId}/edit`,
                successMessage: "User unarchived successfully",
                errorMessage: "Failed to unarchive user",
            },
            audit: {
                entityType: "user",
                entityId: Number(userId) || 0,
                action: "update",
            },
        });
    }

    return redirectWithRequestError(request, `/users/${userId}/edit`, "Invalid action");
}

export default function UserRedirectPage() {
    return null;
}
