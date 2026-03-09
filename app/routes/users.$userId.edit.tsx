import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Form } from "react-router";
import ProfileForm from "~/components/dashboard/ProfileForm";
import PageHeader from '~/components/shared/ui/PageHeader';
import Button from '~/components/shared/ui/Button';
import BackButton from '~/components/shared/ui/BackButton';
import DeleteButton from "~/components/shared/ui/DeleteButton";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { requireUserDirectoryAccess } from "~/lib/access-policy.server";

export const meta: MetaFunction = () => [
    { title: "Edit User — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { user: sessionUser, companyId, sdb } = await getScopedDb(request, context, requireUserDirectoryAccess);

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    return trackServerOperation({
        event: "users.edit.load",
        scope: "route.loader",
        request,
        userId: sessionUser.id,
        companyId,
        entityId: userId,
        details: { route: "users.$userId.edit" },
        run: async () => {
            const { user, hotels, locations, districts } = await sdb.users.getProfileData(userId);
            if (!user) {
                throw new Response("User not found", { status: 404 });
            }

            return { user, currentUserRole: sessionUser.role, hotels, locations, districts };
        },
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { user: sessionUser, companyId, sdb } = await getScopedDb(request, context, requireUserDirectoryAccess);

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }
    return trackServerOperation({
        event: "users.edit",
        scope: "route.action",
        request,
        userId: sessionUser.id,
        companyId,
        entityId: userId,
        details: { route: "users.$userId.edit" },
        run: async () => {
            const formData = await request.formData();
            const intent = formData.get("intent");

            const currentUser = await sdb.users.getProfileUser(userId);
            if (!currentUser) {
                throw new Response("User not found", { status: 404 });
            }

            if (intent === "deleteUser") {
                const result = await sdb.users.deleteAction({
                    request,
                    user: sessionUser,
                    targetUserId: userId,
                    currentUser,
                });
                if (!result.ok) {
                    return redirectWithRequestError(request, `/users/${userId}/edit`, result.error);
                }

                return redirectWithRequestSuccess(request, "/users", "User deleted successfully");
            }

            const result = await sdb.users.updateAction({
                request,
                user: sessionUser,
                targetUserId: userId,
                currentUser,
                formData,
                assets: context.cloudflare.env.ASSETS,
            });
            if (!result.ok) {
                return redirectWithRequestError(request, `/users/${userId}/edit`, result.error);
            }

            return redirectWithRequestSuccess(request, `/users/${userId}/edit`, "User updated successfully");
        },
    });
}

export default function EditUserPage() {
    const { user, currentUserRole, hotels, locations, districts } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit User"
                leftSlot={<BackButton to="/users" />}
                rightSlot={
                    <div className="flex items-center gap-2">
                        <Button type="submit" variant="primary" form="profile-form">
                            Save
                        </Button>
                        <Form method="post">
                            <input type="hidden" name="intent" value="deleteUser" />
                            <DeleteButton type="submit" title="Delete user" />
                        </Form>
                    </div>
                }
            />
            <ProfileForm
                user={user}
                currentUserRole={currentUserRole}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit
            />
        </div>
    );
}
