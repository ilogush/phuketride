import { type ActionFunctionArgs, redirect } from "react-router";
import { logout } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
    const cookie = await logout(request);

    return redirect("/login", {
        headers: {
            "Set-Cookie": cookie,
        },
    });
}

export async function loader() {
    return redirect("/login");
}
