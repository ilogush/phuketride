import { type LoaderFunctionArgs, redirect } from "react-router";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    return redirect(`/profile/edit${url.search}`);
}

export default function ProfilePage() {
    useUrlToast();
    return null;
}
