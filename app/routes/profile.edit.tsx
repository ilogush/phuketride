import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import ProfileForm from "~/components/dashboard/ProfileForm";
import { useUrlToast } from "~/lib/useUrlToast";
import {
    loadEditableProfilePageData,
    loadEditableProfileUser,
    updateManagedUser,
} from "~/lib/user-profile.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user: sessionUser, companyId } = await requireSelfProfileAccess(request);
    return trackServerOperation({
        event: "profile.edit.load",
        scope: "route.loader",
        request,
        userId: sessionUser.id,
        companyId,
        details: { route: "profile.edit" },
        run: async () => {
            const { user, hotels, locations, districts } = await loadEditableProfilePageData(context.cloudflare.env.DB, sessionUser.id);
            if (!user) throw new Response("User not found", { status: 404 });

            return {
                user,
                currentUserRole: sessionUser.role,
                hotels,
                locations,
                districts,
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireSelfProfileAccess(request);
    return trackServerOperation({
        event: "profile.edit",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "profile.edit" },
        run: async () => {
            const formData = await request.formData();
            const currentUser = await loadEditableProfileUser(context.cloudflare.env.DB, user.id);
            if (!currentUser) throw new Response("User not found", { status: 404 });

            // parseWithSchema(userSchema, ...) is delegated to updateManagedUser in user-profile.server.
            const result = await updateManagedUser({
                db: context.cloudflare.env.DB,
                bucket: context.cloudflare.env.ASSETS,
                request,
                actor: user,
                targetUserId: user.id,
                currentUser,
                formData,
                allowEmailChange: false,
                allowRoleChange: false,
            });
            if (!result.ok) {
                return redirectWithRequestError(request, "/profile/edit", result.error);
            }

            return redirectWithRequestSuccess(request, "/profile", "Profile updated successfully");
        },
    });
}

export default function EditProfilePage() {
    const { user, currentUserRole, hotels, locations, districts } = useLoaderData<typeof loader>();
    useUrlToast();

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit Profile"
                leftActions={<BackButton to="/profile" />}
                rightActions={
                    <Button type="submit" variant="solid" form="profile-form">
                        Save
                    </Button>
                }
            />
            <ProfileForm
                user={user}
                currentUserRole={currentUserRole}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
