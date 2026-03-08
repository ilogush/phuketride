import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Profile — Phuket Ride" },
    { name: "robots", content: "noindex, nofollow" },
];
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    return redirect(`/profile/edit${url.search}`);
}

export default function ProfilePage() {
    useUrlToast();
    return null;
}
