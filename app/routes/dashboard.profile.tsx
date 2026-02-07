import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import Button from "~/components/ui/Button";
import PageHeader from "~/components/ui/PageHeader";
import ProfileForm from "~/components/profile/ProfileForm";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();

    if (!fullUser) throw new Response("User not found", { status: 404 });

    // Load reference data
    const [country, hotel, location, district] = await Promise.all([
        fullUser.countryId ? db.select().from(schema.countries).where(eq(schema.countries.id, fullUser.countryId)).get() : null,
        fullUser.hotelId ? db.select().from(schema.hotels).where(eq(schema.hotels.id, fullUser.hotelId)).get() : null,
        fullUser.locationId ? db.select().from(schema.locations).where(eq(schema.locations.id, fullUser.locationId)).get() : null,
        fullUser.districtId ? db.select().from(schema.districts).where(eq(schema.districts.id, fullUser.districtId)).get() : null,
    ]);

    return { user: fullUser, country, hotel, location, district };
}

export default function ProfilePage() {
    const { user, country, hotel, location, district } = useLoaderData<typeof loader>();

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
                districts={[]}
                country={country}
                hotel={hotel}
                location={location}
                district={district}
                isEdit={false}
            />
        </div>
    );
}
