import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { getUserFromSession, login } from "~/lib/auth.server";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    // If already logged in, redirect to dashboard
    const user = await getUserFromSession(request);
    if (user) {
        return redirect("/dashboard");
    }
    return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    console.log("Login attempt:", { email });

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    const result = await login(context.cloudflare.env.DB, email, password);

    if ("error" in result) {
        console.log("Login failed:", result.error);
        return { error: result.error };
    }

    console.log("Login successful, redirecting to dashboard");

    // Set cookie and redirect to dashboard
    return redirect("/dashboard", {
        headers: {
            "Set-Cookie": result.cookie,
        },
    });
}

export default function LoginPage() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#fafafa]">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full px-6 relative z-10 transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 md:p-12">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                            <img src="/android-chrome-192x192.png" alt="Logo" className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-500 font-medium">Sign in to your account</p>
                    </div>

                    <Form method="post" className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
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
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 animate-in shake-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <p className="text-sm font-bold text-red-600">{actionData.error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-gray-200 hover:shadow-gray-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : "Sign In"}
                            </span>
                        </button>
                    </Form>

                    <div className="mt-10 text-center">
                        <p className="text-sm font-medium text-gray-400">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="text-gray-900 font-bold hover:underline underline-offset-4 transition-all"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
