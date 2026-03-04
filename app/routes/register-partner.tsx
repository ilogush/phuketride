import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { getUserFromSession, serializeSession } from "~/lib/auth.server";
import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";
import { hashPassword } from "~/lib/password.server";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import Button from "~/components/dashboard/Button";
import { z } from "zod";

export const meta: MetaFunction = () => {
    const title = "Partner Registration | Phuket Ride";
    const description = "Register as a Phuket Ride partner to publish your fleet, manage bookings, and grow rental revenue.";

    return [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
    ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    // If already logged in, redirect to dashboard
    const user = await getUserFromSession(request);
    if (user) {
        return redirect("/home");
    }

    // Load districts for Phuket (location_id = 1)
    const districtsResult = await context.cloudflare.env.DB
        .prepare(
            `
            SELECT id, name
            FROM districts
            WHERE location_id = 1 AND is_active = 1
            ORDER BY name
            `
        )
        .all();
    const districtsList = (districtsResult.results ?? []) as Array<{ id: number; name: string }>;

    return { districts: districtsList };
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
    const latinRegex = /^[a-zA-Z\s\-']+$/;
    const registerPartnerSchema = z.object({
        email: z.string().trim().email("Invalid email format"),
        password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
        name: z.string().trim().min(1, "First name is required").regex(latinRegex, "Only Latin characters allowed in first name"),
        surname: z.string().trim().min(1, "Last name is required").regex(latinRegex, "Only Latin characters allowed in last name"),
        phone: z.string().trim().refine((value) => /^\+?[0-9]{10,15}$/.test(value.replace(/[\s\-()]/g, "")), "Invalid phone number format"),
        telegram: z.string().trim().optional(),
        companyName: z.string().trim().min(1, "Company name is required"),
        districtId: z.coerce.number().int().positive("District is required"),
        street: z.string().trim().min(1, "Street is required"),
        houseNumber: z.string().trim().min(1, "House number is required"),
    });
    const parsed = registerPartnerSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        name: formData.get("name"),
        surname: formData.get("surname"),
        phone: formData.get("phone"),
        telegram: formData.get("telegram"),
        companyName: formData.get("companyName"),
        districtId: formData.get("districtId"),
        street: formData.get("street"),
        houseNumber: formData.get("houseNumber"),
    });
    if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message || "Validation failed" };
    }
    const {
        email,
        password,
        name,
        surname,
        phone,
        telegram,
        companyName,
        districtId,
        street,
        houseNumber,
    } = parsed.data;

    // Check if email already exists
    const existingUser = await context.cloudflare.env.DB
        .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
        .bind(email)
        .all();

    if ((existingUser.results?.length ?? 0) > 0) {
        return { error: "Email already registered" };
    }

    try {
        // Create user and company in transaction
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        
        await context.cloudflare.env.DB.batch([
            context.cloudflare.env.DB.prepare(
                `INSERT INTO users (id, email, role, name, surname, phone, telegram, password_hash, is_first_login, created_at, updated_at)
                 VALUES (?, ?, 'partner', ?, ?, ?, ?, ?, 1, ?, ?)`
            ).bind(userId, email, name, surname, phone, telegram, passwordHash, Date.now(), Date.now()),
            
            context.cloudflare.env.DB.prepare(
                `INSERT INTO companies (name, owner_id, email, phone, telegram, location_id, district_id, street, house_number, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
            ).bind(companyName, userId, email, phone, telegram || null, districtId, street, houseNumber, Date.now(), Date.now())
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

        const cookie = await serializeSession(request, sessionUser);

        return redirect("/home?login=success", {
            headers: {
                "Set-Cookie": cookie,
            },
        });
    } catch {
        return { error: "Registration failed. Please try again" };
    }
}

export default function RegisterPartnerPage() {
    const { districts: districtsList } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
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

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            size="lg"
                        >
                            Create Partner Account
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
                    </div>
                </div>
            </div>
        </div>
    );
}
