import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import ProfileForm from "~/components/dashboard/ProfileForm";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const d1 = context.cloudflare.env.DB;
    const fullUser = await d1
        .prepare(
            `
            SELECT
              id, email, role, name, surname, phone, whatsapp, telegram,
              passport_number AS passportNumber, citizenship, city, country_id AS countryId,
              date_of_birth AS dateOfBirth, gender, passport_photos AS passportPhotos,
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
        .first<Record<string, unknown>>();

    if (!fullUser) throw new Response("User not found", { status: 404 });

    // Load reference data in parallel
    const [country, hotel, location] = await Promise.all([
        fullUser.countryId ? d1.prepare("SELECT * FROM countries WHERE id = ? LIMIT 1").bind(fullUser.countryId).first() : null,
        fullUser.hotelId ? d1.prepare("SELECT * FROM hotels WHERE id = ? LIMIT 1").bind(fullUser.hotelId).first() : null,
        fullUser.locationId ? d1.prepare("SELECT * FROM locations WHERE id = ? LIMIT 1").bind(fullUser.locationId).first() : null,
    ]);

    return { user: fullUser, country, hotel, location };
}

export default function ProfilePage() {
    const { user, country, hotel, location } = useLoaderData<typeof loader>();

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
