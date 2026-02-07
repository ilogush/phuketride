import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";
import { PencilIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();

    if (!fullUser) throw new Response("User not found", { status: 404 });

    return { user: fullUser };
}

export default function ProfilePage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Profile"
                rightActions={
                    <Link to="/profile/edit">
                        <Button variant="secondary" icon={<PencilIcon className="w-4 h-4" />}>
                            Edit Profile
                        </Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 p-8 text-center border-gray-100">
                    <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-gray-50 shadow-sm">
                        <span className="text-white text-3xl font-bold">
                            {(user.name?.[0] || user.email[0] || "?").toUpperCase()}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{user.name} {user.surname}</h2>
                    <p className="text-gray-500 text-sm font-medium capitalize mt-1">{user.role}</p>
                </Card>

                <Card className="lg:col-span-2 p-8 border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Email Address
                            </label>
                            <p className="text-gray-900 font-semibold">{user.email}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Phone Number
                            </label>
                            <p className="text-gray-900 font-semibold">{user.phone || "Not provided"}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Account ID
                            </label>
                            <p className="text-gray-500 text-sm font-mono truncate">{user.id}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
