import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import BackButton from "~/components/ui/BackButton";
import Button from "~/components/ui/Button";
import ProfileForm from "~/components/profile/ProfileForm";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) {
        throw new Response("User not found", { status: 404 });
    }

    // Load reference data
    const [country, hotel, location] = await Promise.all([
        user.countryId ? db.select().from(schema.countries).where(eq(schema.countries.id, user.countryId)).get() : null,
        user.hotelId ? db.select().from(schema.hotels).where(eq(schema.hotels.id, user.hotelId)).get() : null,
        user.locationId ? db.select().from(schema.locations).where(eq(schema.locations.id, user.locationId)).get() : null,
    ]);

    return { user, country, hotel, location };
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
                <Link to={`/users/${user.id}/edit`}>
                    <Button variant="primary">Edit</Button>
                </Link>
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
