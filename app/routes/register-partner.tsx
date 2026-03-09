import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { getUserFromSession, serializeSession } from "~/lib/auth.server";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import AuthFormField from "~/components/public/AuthFormField";
import ClientButton from "~/components/public/ClientButton";
import AuthSelect from "~/components/public/AuthSelect";
import AuthTextInput from "~/components/public/AuthTextInput";
import {
    loadActivePhuketDistricts,
    registerPartnerAccount,
    type ActiveDistrictRow,
} from "~/lib/registration.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";
import { partnerRegistrationSchema } from "~/schemas/registration";
import { useActionToast } from "~/lib/useActionToast";

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
    return trackServerOperation({
        event: "auth.register_partner.load",
        scope: "route.loader",
        request,
        details: { route: "register-partner" },
        run: async () => {
            const user = await getUserFromSession(request);
            if (user) {
                return redirect("/home");
            }

            const districts = await loadActivePhuketDistricts(context.cloudflare.env.DB);
            return { districts };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    return trackServerOperation({
        event: "auth.register_partner.submit",
        scope: "route.action",
        request,
        details: { route: "register-partner" },
        run: async () => {
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
            const parsed = parseWithSchema(
                partnerRegistrationSchema,
                {
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
                },
                "Validation failed"
            );
            if (!parsed.ok) {
                return { error: parsed.error };
            }

            const result = await registerPartnerAccount({
                db: context.cloudflare.env.DB,
                input: parsed.data,
            });
            if (!result.ok) {
                return { error: result.error };
            }

            const cookie = await serializeSession(request, result.sessionUser);
            return redirect("/home?login=success", {
                headers: {
                    "Set-Cookie": cookie,
                },
            });
        },
    });
}

export default function RegisterPartnerPage() {
    const { districts: districtsList } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [showPassword, setShowPassword] = useState(false);
    const { validateLatinInput } = useLatinValidation();
    useActionToast(actionData?.error);

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
                            <AuthTextInput
                                id="name"
                                label="First Name"
                                name="name"
                                type="text"
                                autoComplete="given-name"
                                required
                                pattern="[a-zA-Z\s\-']+"
                                onChange={(e) => validateLatinInput(e, "First Name")}
                                placeholder="John"
                            />

                            <AuthTextInput
                                id="surname"
                                label="Last Name"
                                name="surname"
                                type="text"
                                autoComplete="family-name"
                                required
                                pattern="[a-zA-Z\s\-']+"
                                onChange={(e) => validateLatinInput(e, "Last Name")}
                                placeholder="Smith"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AuthTextInput
                                id="email"
                                label="Email Address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="john.smith@example.com"
                            />

                            <AuthTextInput
                                id="phone"
                                label="Phone Number"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                placeholder="+66812345678"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AuthTextInput
                                id="telegram"
                                label="Telegram"
                                name="telegram"
                                type="text"
                                placeholder="@username"
                            />

                            <AuthFormField id="password" label="Password" required>
                                <div className="relative">
                                    <AuthTextInput
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        placeholder="Min 6 characters"
                                        className="pr-14"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </AuthFormField>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AuthTextInput
                                id="companyName"
                                label="Company Name"
                                name="companyName"
                                type="text"
                                required
                                placeholder="Your Company Name"
                            />

                            <AuthSelect
                                id="districtId"
                                label="District (Phuket)"
                                name="districtId"
                                required
                            >
                                <option value="">Select district</option>
                                {districtsList.map((district: ActiveDistrictRow) => (
                                    <option key={district.id} value={district.id}>
                                        {district.name}
                                    </option>
                                ))}
                            </AuthSelect>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AuthTextInput
                                id="street"
                                label="Street"
                                name="street"
                                type="text"
                                required
                                onChange={(e) => validateLatinInput(e, "Street")}
                                placeholder="Street name"
                            />

                            <AuthTextInput
                                id="houseNumber"
                                label="House Number"
                                name="houseNumber"
                                type="text"
                                required
                                placeholder="123/45"
                            />
                        </div>

                        <ClientButton
                            type="submit"
                            fullWidth
                            size="lg"
                            className="bg-gray-900 hover:bg-gray-800"
                        >
                            Create Partner Account
                        </ClientButton>
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
