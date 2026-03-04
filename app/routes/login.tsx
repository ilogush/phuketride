import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { Form, Link, useActionData, useSearchParams } from "react-router";
import { getUserFromSession, login } from "~/lib/auth.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import Button from "~/components/dashboard/Button";
import { loginSchema } from "~/schemas/user";

export const meta: MetaFunction = () => {
    const title = "Sign In | Phuket Ride";
    const description = "Sign in to Phuket Ride to manage bookings, contracts, and your rental activity.";

    return [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
    ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        // If already logged in, redirect to dashboard
        const user = await getUserFromSession(request);
        if (user) {
            return redirect("/home");
        }
        return null;
    } catch {
        return null;
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    try {
        const identifier = getClientIdentifier(request);
        const rateLimit = await checkRateLimit(
            (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
            identifier,
            "login"
        );
        if (!rateLimit.allowed) {
            return { error: "Too many login attempts. Try again later." };
        }

        const formData = await request.formData();
        const parsed = loginSchema.safeParse({
            email: formData.get("email"),
            password: formData.get("password"),
        });
        if (!parsed.success) {
            return { error: parsed.error.errors[0]?.message || "Validation failed" };
        }
        const { email, password } = parsed.data;

        if (!context.cloudflare.env.DB) {
            return { error: "Database is not configured" };
        }

        const result = await login(context.cloudflare.env.DB, email, password, request);

        if ("error" in result) {
            return { error: result.error };
        }

        // Set cookie and redirect to dashboard
        return redirect("/home?login=success", {
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
    const [searchParams] = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const toast = useToast();

    // Show toast on error (only once per action)
    useEffect(() => {
        if (actionData?.error) {
            toast.error(actionData.error, 5000);
        }
    }, [actionData?.error, toast]);

    // Show logout success toast (only on fresh login page load, not on failed login)
    useEffect(() => {
        const logoutSuccess = searchParams.get('logout') === 'success';
        const loginSuccess = searchParams.get('login') === 'success';
        
        // Show logout success only if user just logged out (not after failed login attempt)
        if (logoutSuccess && !actionData?.error && !loginSuccess) {
            toast.success('Logged out successfully', 5000);
        }
    }, [searchParams, actionData, toast]);

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
                                <Button
                                    type="button"
                                    variant="unstyled"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-2"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                        </div>

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
