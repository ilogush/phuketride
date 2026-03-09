import { type ActionFunctionArgs, type LoaderFunctionArgs, Form, redirect } from "react-router";
import { logout, requireAuth } from "~/lib/auth.server";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { assertSameOriginMutation } from "~/lib/request-security.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAuth(request);
    return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
    assertSameOriginMutation(request);
    const user = await requireAuth(request).catch(() => null);
    
    if (user) {
        await quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId || null,
            entityType: "user",
            entityId: user.id,
            action: "logout",
            ...getRequestMetadata(request),
        });
    }

    const cookie = await logout(request);

    return redirect("/login?logout=success", {
        headers: {
            "Set-Cookie": cookie,
        },
    });
}

export default function LogoutPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
            <div className="max-w-md w-full px-6">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-900 mb-6 shadow-lg">
                        <img src="/android-chrome-192x192.png" alt="Logo" className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        Logged Out
                    </h1>
                    <p className="text-gray-500 font-medium mb-8">
                        You have been successfully logged out
                    </p>
                    <Form method="post">
                        <button
                            type="submit"
                            className="inline-block w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-xl shadow-gray-200 hover:shadow-gray-300"
                        >
                            Confirm Logout
                        </button>
                    </Form>
                </div>
            </div>
        </div>
    );
}
