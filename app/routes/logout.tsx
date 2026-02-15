import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "react-router";
import { Link } from "react-router";
import { logout } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const cookie = await logout(request);

    return redirect("/login?logout=success", {
        headers: {
            "Set-Cookie": cookie,
        },
    });
}

export async function action({ request }: ActionFunctionArgs) {
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
                    <Link
                        to="/login"
                        className="inline-block w-full bg-gray-900 hover:bg-black text-gray-500 font-bold py-3 rounded-xl transition-all duration-300 shadow-xl shadow-gray-200 hover:shadow-gray-300"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
