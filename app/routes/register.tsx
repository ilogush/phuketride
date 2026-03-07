import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { Form, Link, useActionData } from "react-router";
import { getUserFromSession, serializeSession } from "~/lib/auth.server";
import { useEffect, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";
import { useToast } from "~/lib/toast";
import Button from "~/components/public/Button";
import AuthFormField from "~/components/public/AuthFormField";
import AuthTextInput from "~/components/public/AuthTextInput";
import { registerUserAccount } from "~/lib/registration.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";
import { userRegistrationSchema } from "~/schemas/registration";

export const meta: MetaFunction = () => {
    const title = "Create Account | Phuket Ride";
    const description = "Create a Phuket Ride account to book cars, track rentals, and manage your trips.";

    return [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    return trackServerOperation({
        event: "auth.register.load",
        scope: "route.loader",
        request,
        details: { route: "register" },
        run: async () => {
            const user = await getUserFromSession(request);
            if (user) {
                return redirect("/home");
            }
            return null;
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    return trackServerOperation({
        event: "auth.register.submit",
        scope: "route.action",
        request,
        details: { route: "register" },
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
                userRegistrationSchema,
                {
                    email: formData.get("email"),
                    password: formData.get("password"),
                    firstName: formData.get("firstName"),
                    lastName: formData.get("lastName"),
                    phone: formData.get("phone"),
                },
                "Validation failed"
            );
            if (!parsed.ok) {
                return { error: parsed.error };
            }

            const result = await registerUserAccount({
                db: context.cloudflare.env.DB,
                input: parsed.data,
            });
            if (!result.ok) {
                return { error: result.error };
            }

            const cookie = await serializeSession(request, result.sessionUser);
            return redirect("/home?login=success", {
                headers: { "Set-Cookie": cookie },
            });
        },
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
                            <AuthFormField id="firstName" label="First Name" required>
                                <AuthTextInput
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    autoComplete="given-name"
                                    required
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, "First Name")}
                                    placeholder="John"
                                />
                            </AuthFormField>

                            <AuthFormField id="lastName" label="Last Name" required>
                                <AuthTextInput
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    autoComplete="family-name"
                                    required
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, "Last Name")}
                                    placeholder="Smith"
                                />
                            </AuthFormField>
                        </div>

                        <AuthFormField id="email" label="Email Address" required>
                            <AuthTextInput
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="john.smith@example.com"
                            />
                        </AuthFormField>

                        <AuthFormField id="phone" label="Phone Number" required>
                            <AuthTextInput
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                placeholder="+6699123456"
                            />
                        </AuthFormField>

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
                                />
                                <Button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                        </AuthFormField>

                        <Button
                            type="submit"
                            className="w-full rounded-xl bg-gray-900 px-5 py-3 text-base font-semibold text-white hover:bg-gray-800"
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
