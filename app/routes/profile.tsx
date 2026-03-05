import { type LoaderFunctionArgs, redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    return redirect(`/profile/edit${url.search}`);
}

export default function ProfilePage() {
    return null;
}
