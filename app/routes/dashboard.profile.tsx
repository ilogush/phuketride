import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function ProfilePage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 mt-2">
                    Manage your account settings
                </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm p-4">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <p className="text-gray-900">{user.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                        </label>
                        <p className="text-gray-900">{user.name || "Not set"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                        </label>
                        <p className="text-gray-900 capitalize">{user.role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
