import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "react-router";
import { getUserFromSession, login } from "~/lib/auth.server";
import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import Button from "~/components/dashboard/Button";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        // If already logged in, redirect to dashboard
        const user = await getUserFromSession(request);
        if (user) {
            return redirect("/dashboard");
        }
        return null;
    } catch (error) {
        console.error("[LOGIN_LOADER_ERROR]", {
            at: new Date().toISOString(),
            method: request.method,
            url: request.url,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    try {
        const formData = await request.formData();
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!email || !password) {
            return { error: "Email and password are required" };
        }

        if (!context.cloudflare.env.DB) {
            return { error: "Database is not configured" };
        }

        const result = await login(context.cloudflare.env.DB, email, password, request);

        if ("error" in result) {
            return { error: result.error };
        }

        // Set cookie and redirect to dashboard
        return redirect("/dashboard?login=success", {
            headers: {
                "Set-Cookie": result.cookie,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: `Login action crash: ${message}` };
    }
}

export default function LoginPage() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const [searchParams] = useSearchParams();
    const isSubmitting = navigation.state === "submitting";
    const [showPassword, setShowPassword] = useState(false);
    const toast = useToast();

    // Show toast on error
    useEffect(() => {
        if (actionData?.error) {
            toast.error(actionData.error);
        }
    }, [actionData?.error, toast]);

    // Show logout success toast
    useEffect(() => {
        if (searchParams.get('logout') === 'success') {
            toast.success('Logged out successfully');
        }
    }, [searchParams, toast]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
            <div className="max-w-md w-full px-6">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            Sign in
                        </h1>
                    </div>

                    <Form method="post" className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                placeholder="Email address"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {actionData?.error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                <p className="text-sm font-medium text-red-600">{actionData.error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            size="lg"
                        >
                            Sign in
                        </Button>
                    </Form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            No account?{" "}
                            <Link
                                to="/register"
                                className="text-gray-900 font-semibold hover:underline"
                            >
                                Register
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
