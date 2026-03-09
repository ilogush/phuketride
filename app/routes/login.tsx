import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { Form, Link, useActionData, useSearchParams } from "react-router";
import { getUserFromSession, login } from "~/lib/auth.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import AuthFormField from "~/components/public/AuthFormField";
import ClientButton from "~/components/public/ClientButton";
import AuthTextInput from "~/components/public/AuthTextInput";
import { loginSchema } from "~/schemas/user";
import { parseWithSchema } from "~/lib/validation.server";
import { useActionToast } from "~/lib/useActionToast";
import { useToast } from "~/lib/toast";

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
        return await trackServerOperation({
            event: "auth.login",
            scope: "route.action",
            request,
            details: { route: "login", identifier },
            run: async () => {
                const rateLimit = await checkRateLimit(
                    (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
                    identifier,
                    "login"
                );
                if (!rateLimit.allowed) {
                    await quickAudit({
                        db: context.cloudflare.env.DB,
                        userId: null,
                        role: "anonymous",
                        entityType: "user",
                        action: "login_blocked",
                        afterState: { identifier, reason: "rate_limit" },
                        ...getRequestMetadata(request),
                    });
                    return { error: "Too many login attempts. Try again later." };
                }

                const formData = await request.formData();
                const parsed = parseWithSchema(
                    loginSchema,
                    {
                        email: formData.get("email"),
                        password: formData.get("password"),
                    },
                    "Validation failed"
                );
                if (!parsed.ok) {
                    return { error: parsed.error };
                }
                const { email, password } = parsed.data;

                if (!context.cloudflare.env.DB) {
                    return { error: "Database is not configured" };
                }

                const result = await login(context.cloudflare.env.DB, email, password, request);

                if ("error" in result) {
                    await quickAudit({
                        db: context.cloudflare.env.DB,
                        userId: null,
                        role: "anonymous",
                        entityType: "user",
                        action: "login_failed",
                        afterState: {
                            identifier,
                            email,
                            reason: result.error,
                        },
                        ...getRequestMetadata(request),
                    });
                    return { error: result.error };
                }

                await quickAudit({
                    db: context.cloudflare.env.DB,
                    userId: result.user.id,
                    role: result.user.role,
                    companyId: result.user.companyId || null,
                    entityType: "user",
                    entityId: result.user.id,
                    action: "login",
                    ...getRequestMetadata(request),
                });

                return redirect("/home?login=success", {
                    headers: {
                        "Set-Cookie": result.cookie,
                    },
                });
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: `Login action crash: ${message}` };
    }
}

export default function LoginPage() {
    const actionData = useActionData<typeof action>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const toast = useToast();
    useActionToast(actionData?.error, { type: "error", duration: 5000 });

    // Show logout success toast (only on fresh login page load, not on failed login)
    useEffect(() => {
        const logoutSuccess = searchParams.get('logout') === 'success';
        const loginSuccess = searchParams.get('login') === 'success';
        
        // Show logout success only if user just logged out (not after failed login attempt)
        if (logoutSuccess && !actionData?.error && !loginSuccess) {
            void toast.success('Logged out successfully', 5000);
            
            // Clear the param from URL
            const next = new URLSearchParams(searchParams);
            next.delete('logout');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, actionData, toast, setSearchParams]);

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
                        <AuthTextInput
                            id="email"
                            label="Email address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="Email address"
                        />

                        <AuthFormField id="password" label="Password" required>
                            <div className="relative">
                                <AuthTextInput
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="pr-14"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-2"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </AuthFormField>

                        <ClientButton
                            type="submit"
                            fullWidth
                            size="lg"
                        >
                            Sign in
                        </ClientButton>
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
