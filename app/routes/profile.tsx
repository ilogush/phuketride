import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import ProfileForm from "~/components/dashboard/ProfileForm";

interface ProfileUser {
    id: string;
    email: string;
    role: "admin" | "partner" | "manager" | "user";
    name: string | null;
    surname: string | null;
    phone: string | null;
    whatsapp: string | null;
    telegram: string | null;
    passportNumber: string | null;
    passportPhotos: string | null;
    driverLicensePhotos: string | null;
    avatarUrl: string | null;
    hotelId: number | null;
    roomNumber: string | null;
    locationId: number | null;
    districtId: number | null;
    address: string | null;
    isFirstLogin: number | null;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const d1 = context.cloudflare.env.DB;
    const rawUser = (await d1
        .prepare(
            `
            SELECT
              id, email, role, name, surname, phone, whatsapp, telegram,
              passport_number AS passportNumber,
              passport_photos AS passportPhotos,
              driver_license_photos AS driverLicensePhotos, avatar_url AS avatarUrl,
              hotel_id AS hotelId, room_number AS roomNumber, location_id AS locationId,
              district_id AS districtId, address, is_first_login AS isFirstLogin,
              archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt
            FROM users
            WHERE id = ?
            LIMIT 1
            `
        )
        .bind(sessionUser.id)
        .first()) as ProfileUser | null;

    if (!rawUser) throw new Response("User not found", { status: 404 });

    const fullUser: ProfileUser = { ...rawUser };

    // Load reference data in parallel
    const [hotel, location] = await Promise.all([
        fullUser.hotelId ? d1.prepare("SELECT * FROM hotels WHERE id = ? LIMIT 1").bind(fullUser.hotelId).first() : null,
        fullUser.locationId ? d1.prepare("SELECT * FROM locations WHERE id = ? LIMIT 1").bind(fullUser.locationId).first() : null,
    ]);

    return { user: fullUser, hotel, location };
}

export default function ProfilePage() {
    const { user, hotel, location } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <PageHeader
                title="Profile"
                rightActions={
                    <Link to="/profile/edit">
                        <Button variant="primary">Edit</Button>
                    </Link>
                }
            />
            <ProfileForm
                user={user}
                hotels={[]}
                locations={[]}
                hotel={hotel}
                location={location}
                isEdit={false}
            />
        </div>
    );
}
