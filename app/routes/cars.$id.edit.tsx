import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import CarEditPageView from "~/features/car-edit/CarEditPageView";
import { submitCarEditAction } from "~/features/car-edit/car-edit.action.server";
import { loadCarEditPage } from "~/features/car-edit/car-edit.loader.server";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    return loadCarEditPage({
        db: context.cloudflare.env.DB,
        request,
        carIdParam: params.id,
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    return submitCarEditAction({ request, context, params });
}

export default function EditCarPage() {
    const data = useLoaderData<typeof loader>();
    useUrlToast();
    return <CarEditPageView {...data} />;
}
