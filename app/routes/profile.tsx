import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Profile — Phuket Ride" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    return redirect(`/profile/edit${url.search}`);
}

export default function ProfilePage() {
    return null;
}
