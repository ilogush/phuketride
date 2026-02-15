import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import ProfileForm from "~/components/dashboard/ProfileForm";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const userId = params.userId;
    if (!userId) {
        throw new Response("User ID is required", { status: 400 });
    }

    const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: { passwordHash: false },
    });
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
