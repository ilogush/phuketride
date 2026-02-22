import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import ProfileForm from "~/components/dashboard/ProfileForm";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await requireAuth(request);

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const userResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT id, email, role, name, surname, phone, whatsapp, telegram,
                   passport_number AS passportNumber, citizenship, city, country_id AS countryId,
                   date_of_birth AS dateOfBirth, gender, passport_photos AS passportPhotos,
                   driver_license_photos AS driverLicensePhotos, avatar_url AS avatarUrl,
                   hotel_id AS hotelId, room_number AS roomNumber, location_id AS locationId,
                   district_id AS districtId, address, archived_at AS archivedAt
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .bind(userId)
        .first<any>();
    const user = userResult || null;
    if (!user) {
        throw new Response("User not found", { status: 404 });
    }

    // Load reference data
    const [country, hotel, location] = await Promise.all([
        user.countryId
            ? context.cloudflare.env.DB.prepare("SELECT * FROM countries WHERE id = ? LIMIT 1").bind(user.countryId).first<any>()
            : null,
        user.hotelId
            ? context.cloudflare.env.DB.prepare("SELECT * FROM hotels WHERE id = ? LIMIT 1").bind(user.hotelId).first<any>()
            : null,
        user.locationId
            ? context.cloudflare.env.DB.prepare("SELECT * FROM locations WHERE id = ? LIMIT 1").bind(user.locationId).first<any>()
            : null,
    ]);

    return { user, country, hotel, location };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const sessionUser = await requireAuth(request);
    
    if (sessionUser.role !== "admin") {
        return redirect(`/dashboard/users/${params.userId}?error=Access denied`);
    }

    const formData = await request.formData();
    const intent = formData.get("intent");
    const userId = params.userId!;

    if (intent === "archive") {
        const { archiveUser } = await import("~/lib/archive.server");
        const result = await archiveUser(context.cloudflare.env.DB, userId);
        
        if (result.success) {
            return redirect(`/dashboard/users?success=${encodeURIComponent(result.message || "User archived successfully")}`);
        } else {
            return redirect(`/dashboard/users/${userId}?error=${encodeURIComponent(result.message || result.error || "Failed to archive user")}`);
        }
    }

    if (intent === "unarchive") {
        const { unarchiveUser } = await import("~/lib/archive.server");
        const result = await unarchiveUser(context.cloudflare.env.DB, userId);
        
        if (result.success) {
            return redirect(`/dashboard/users/${userId}?success=${encodeURIComponent(result.message || "User unarchived successfully")}`);
        } else {
            return redirect(`/dashboard/users/${userId}?error=${encodeURIComponent(result.message || result.error || "Failed to unarchive user")}`);
        }
    }

    return redirect(`/dashboard/users/${userId}`);
}

export default function UserDetailPage() {
    const { user, country, hotel, location } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/users" />
                    <PageHeader title="Profile" />
                </div>
                <div className="flex gap-2">
                    {user.archivedAt ? (
                        <Form method="post">
                            <input type="hidden" name="intent" value="unarchive" />
                            <Button type="submit" variant="primary">
                                Unarchive
                            </Button>
                        </Form>
                    ) : (
                        <Form method="post">
                            <input type="hidden" name="intent" value="archive" />
                            <Button type="submit" variant="secondary">
                                Archive
                            </Button>
                        </Form>
                    )}
                    <Link to={`/users/${user.id}/edit`}>
                        <Button variant="primary">Edit</Button>
                    </Link>
                </div>
            </div>

            <ProfileForm
                user={user}
                countries={[]}
                hotels={[]}
                locations={[]}
                country={country}
                hotel={hotel}
                location={location}
                isEdit={false}
            />
        </div>
    );
}
