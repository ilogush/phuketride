import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { Form, Link, useActionData } from "react-router";
import { getUserFromSession } from "~/lib/auth.server";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useLatinValidation } from "~/lib/useLatinValidation";
import Button from "~/components/dashboard/Button";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";
import { serializeSession } from "~/lib/auth.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { z } from "zod";
import { hashPassword } from "~/lib/password.server";

export async function loader({ request }: LoaderFunctionArgs) {
    // If already logged in, redirect to dashboard
    const user = await getUserFromSession(request);
    if (user) {
        return redirect("/dashboard");
    }
    return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimit(
        (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
        identifier,
        "register"
    );
    if (!rateLimit.allowed) {
        return { error: "Too many registration attempts. Try again later." };
    }

    const formData = await request.formData();
    const registerInputSchema = z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        phone: z.string().trim().min(1, "Phone is required"),
    });
    const parsed = registerInputSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        phone: formData.get("phone"),
    });
    if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message || "Validation failed" };
    }
    const { email, password, firstName, lastName, phone } = parsed.data;

    const d1 = context.cloudflare.env.DB;
    const existing = await d1
        .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
        .bind(email)
        .all();
    if ((existing.results?.length ?? 0) > 0) {
        return { error: "Email already registered" };
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await d1
        .prepare(
            `
            INSERT INTO users (
                id, email, role, name, surname, phone, password_hash, created_at, updated_at
            ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
            `
        )
        .bind(id, email, firstName, lastName, phone, passwordHash, Date.now(), Date.now())
        .run();

    const cookie = await serializeSession(request, {
        id,
        email,
        role: "user",
        name: firstName,
        surname: lastName,
    });

    return redirect("/dashboard?login=success", {
        headers: { "Set-Cookie": cookie },
    });
}

export default function RegisterPage() {
    const actionData = useActionData<typeof action>();
    const [showPassword, setShowPassword] = useState(false);
    const { validateLatinInput } = useLatinValidation();
    const toast = useToast();

    useEffect(() => {
        if (actionData?.error) {
            toast.error(actionData.error);
        }
    }, [actionData?.error, toast]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-2xl w-full px-6">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            Create Account
                        </h1>
                        <p className="text-gray-600">Sign up to browse and rent cars</p>
                    </div>

                    <Form method="post" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    autoComplete="given-name"
                                    required
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, 'First Name')}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="John"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    autoComplete="family-name"
                                    required
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, 'Last Name')}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="Smith"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                placeholder="john.smith@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                placeholder="+6699123456"
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
                                    autoComplete="new-password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="Min 6 characters"
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
                            Create Account
                        </Button>
                    </Form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-gray-900 font-semibold hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Want to become a partner?{" "}
                            <Link
                                to="/register-partner"
                                className="text-gray-900 font-semibold hover:underline"
                            >
                                Partner registration
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
