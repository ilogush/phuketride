import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { Form, Link, useActionData, useNavigation, useLoaderData } from "react-router";
import { getUserFromSession } from "~/lib/auth.server";
import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import { districts, users } from "~/db/schema";
import { useToast } from "~/lib/toast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";

export async function loader({ request, context }: LoaderFunctionArgs) {
    // If already logged in, redirect to dashboard
    const user = await getUserFromSession(request);
    if (user) {
        return redirect("/dashboard");
    }

    // Load districts for Phuket (location_id = 1)
    const db = drizzle(context.cloudflare.env.DB);
    const districtsList = await db
        .select()
        .from(districts)
        .where(and(eq(districts.locationId, 1), eq(districts.isActive, true)))
        .orderBy(districts.name);

    return { districts: districtsList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    
    // User data
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const name = (formData.get("name") as string)?.trim();
    const surname = (formData.get("surname") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const telegram = (formData.get("telegram") as string)?.trim() || null;
    
    // Company data
    const companyName = (formData.get("companyName") as string)?.trim();
    const districtId = formData.get("districtId") as string;
    const street = (formData.get("street") as string)?.trim();
    const houseNumber = (formData.get("houseNumber") as string)?.trim();

    // Required fields validation
    if (!email || !password || !name || !surname || !phone) {
        return { error: "All required fields must be filled" };
    }

    if (!companyName || !districtId || !street || !houseNumber) {
        return { error: "All company fields are required" };
    }

    // Password length validation
    if (password.length < PASSWORD_MIN_LENGTH) {
        return { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
    }

    // Latin characters validation
    const latinRegex = /^[a-zA-Z\s\-']+$/;
    if (!latinRegex.test(name)) {
        return { error: "Only Latin characters allowed in first name" };
    }
    if (!latinRegex.test(surname)) {
        return { error: "Only Latin characters allowed in last name" };
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { error: "Invalid email format" };
    }

    // Phone validation
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-()]/g, ''))) {
        return { error: "Invalid phone number format" };
    }

    const db = drizzle(context.cloudflare.env.DB);

    // Check if email already exists
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (existingUser.length > 0) {
        return { error: "Email already registered" };
    }

    try {
        // Create user and company in transaction
        const userId = crypto.randomUUID();
        const { hashPassword } = await import("~/lib/password.server");
        const passwordHash = await hashPassword(password);
        
        await context.cloudflare.env.DB.batch([
            context.cloudflare.env.DB.prepare(
                `INSERT INTO users (id, email, role, name, surname, phone, telegram, password_hash, is_first_login, created_at, updated_at)
                 VALUES (?, ?, 'partner', ?, ?, ?, ?, ?, 1, ?, ?)`
            ).bind(userId, email, name, surname, phone, telegram, passwordHash, Date.now(), Date.now()),
            
            context.cloudflare.env.DB.prepare(
                `INSERT INTO companies (name, owner_id, email, phone, telegram, location_id, district_id, street, house_number, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
            ).bind(companyName, userId, email, phone, telegram, parseInt(districtId), street, houseNumber, Date.now(), Date.now())
        ]);

        // Get company ID
        const companyResult = await context.cloudflare.env.DB
            .prepare("SELECT id FROM companies WHERE owner_id = ? LIMIT 1")
            .bind(userId)
            .first() as { id: number } | null;

        // Create session
        const sessionUser = {
            id: userId,
            email,
            role: 'partner' as const,
            name,
            surname,
            companyId: companyResult?.id,
        };

        const { sessionCookie } = await import("~/lib/auth.server");
        const cookie = await sessionCookie.serialize(sessionUser);

        return redirect("/dashboard?login=success", {
            headers: {
                "Set-Cookie": cookie,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Registration failed. Please try again" };
    }
}

export default function RegisterPartnerPage() {
    const { districts: districtsList } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const [showPassword, setShowPassword] = useState(false);
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();

    // Show toast on error
    useEffect(() => {
        if (actionData?.error) {
            toast.error(actionData.error);
        }
    }, [actionData?.error, toast]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] py-12">
            <div className="max-w-2xl w-full px-6">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            Partner Registration
                        </h1>
                        <p className="text-gray-600">Create your company account</p>
                    </div>

                    <Form method="post" className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="name"
                                    name="name"
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
                                <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="surname"
                                    name="surname"
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email Address <span className="text-red-500">*</span>
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
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="+66812345678"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="telegram" className="block text-sm font-medium text-gray-700">
                                    Telegram
                                </label>
                                <input
                                    id="telegram"
                                    name="telegram"
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="@username"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                        placeholder="Min 6 characters"
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="Your Company Name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="districtId" className="block text-sm font-medium text-gray-700">
                                    District (Phuket) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="districtId"
                                    name="districtId"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                >
                                    <option value="">Select district</option>
                                    {districtsList.map((district) => (
                                        <option key={district.id} value={district.id}>
                                            {district.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                    Street <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="street"
                                    name="street"
                                    type="text"
                                    required
                                    onChange={(e) => validateLatinInput(e, 'Street')}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="Street name"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700">
                                    House Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="houseNumber"
                                    name="houseNumber"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
                                    placeholder="123/45"
                                />
                            </div>
                        </div>

                        {actionData?.error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                <p className="text-sm font-medium text-red-600">{actionData.error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating account..." : "Create Partner Account"}
                        </button>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
