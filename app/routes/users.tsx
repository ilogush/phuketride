import type { Route } from "./+types/users";
import { getDb, schema } from "../db";
import { userSchema } from "../schemas/user";

export async function loader({ context }: Route.LoaderArgs) {
    const db = getDb(context.cloudflare.env.DB);
    const users = await db.select().from(schema.users);
    return { users };
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = userSchema.safeParse(data);
    if (!result.success) {
        return { errors: result.error.flatten().fieldErrors };
    }

    const db = getDb(context.cloudflare.env.DB);
    await db.insert(schema.users).values(result.data);

    return { success: true };
}

export default function Users({ loaderData, actionData }: Route.ComponentProps) {
    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Users</h1>

                <form method="post" className="bg-white p-6 rounded-lg shadow mb-8">
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        {actionData?.errors?.name && (
                            <p className="text-red-500 text-sm mt-1">{actionData.errors.name}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        {actionData?.errors?.email && (
                            <p className="text-red-500 text-sm mt-1">{actionData.errors.email}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-4 rounded-lg hover:bg-blue-600"
                    >
                        Add User
                    </button>
                </form>

                <div className="bg-white rounded-lg shadow">
                    <ul className="divide-y">
                        {loaderData.users.map((user) => (
                            <li key={user.id} className="p-4">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-gray-600 text-sm">{user.email}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
