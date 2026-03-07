import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";
import ProfileForm from "~/components/dashboard/ProfileForm";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { useUrlToast } from "~/lib/useUrlToast";
import { createManagedUser, loadProfileReferenceData } from "~/lib/user-profile.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId } = await requireAdminUserMutationAccess(request);
    return trackServerOperation({
        event: "users.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "users.create" },
        run: async () => loadProfileReferenceData(context.cloudflare.env.DB),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireAdminUserMutationAccess(request);
    return trackServerOperation({
        event: "users.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "users.create" },
        run: async () => {
            const formData = await request.formData();
            // parseWithSchema(userSchema, ...) is delegated to createManagedUser in user-profile.server.
            const result = await createManagedUser({
                db: context.cloudflare.env.DB,
                request,
                actor: user,
                formData,
            });
            if (!result.ok) {
                return redirectWithRequestError(request, "/users/create", result.error);
            }

            return redirectWithRequestSuccess(request, "/users", "User created successfully");
        },
    });
}

export default function CreateUserPage() {
    const { hotels, locations, districts } = useLoaderData<typeof loader>();
    useUrlToast();

    // Empty user object for create mode
    const emptyUser = {
        id: "",
        email: "",
        name: null,
        surname: null,
        phone: null,
        whatsapp: null,
        telegram: null,
        passportNumber: null,
        hotelId: null,
        roomNumber: null,
        locationId: null,
        districtId: null,
        address: null,
        avatarUrl: null,
        role: "user",
        passportPhotos: null,
        driverLicensePhotos: null,
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New User"
                leftActions={<BackButton to="/users" />}
                rightActions={
                    <Button type="submit" variant="solid" form="profile-form">
                        Create User
                    </Button>
                }
            />
            <ProfileForm
                user={emptyUser}
                currentUserRole="admin"
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
