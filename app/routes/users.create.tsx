import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import ProfileForm from "~/components/dashboard/ProfileForm";
import BackButton from '~/components/shared/ui/BackButton';
import Button from '~/components/shared/ui/Button';
import PageHeader from '~/components/shared/ui/PageHeader';
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";
import { requireUserDirectoryAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";

export const meta: MetaFunction = () => [
    { title: "New User — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireUserDirectoryAccess);
    return trackServerOperation({
        event: "users.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "users.create" },
        run: async () => {
            const data = await sdb.users.getProfileData("");
            return data;
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireUserDirectoryAccess);

    // Rate-limit user creation
    const rateLimit = await checkRateLimit(
        (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
        getClientIdentifier(request, user.id),
        "form"
    );
    if (!rateLimit.allowed) {
        return { error: "Too many requests. Please wait and try again." };
    }

    return trackServerOperation({
        event: "users.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "users.create" },
        run: async () => {
            const formData = await request.formData();
            const result = await sdb.users.createAction({
                request,
                user,
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
                title="New User"
                leftActions={<BackButton to="/users" />}
                rightActions={
                    <Button type="submit" variant="solid" form="profile-form">
                        Create User
                    </Button>
                }
            />
            <ProfileForm
                user={emptyUser}
                currentUserRole={user.role}
                hotels={hotels}
                locations={locations}
                districts={districts}
                isEdit={true}
            />
        </div>
    );
}
