import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import CarEditPageView from "~/features/car-edit/CarEditPageView";
import { submitCarEditAction } from "~/features/car-edit/car-edit.action.server";
import { loadCarEditPage } from "~/features/car-edit/car-edit.loader.server";
import { assertSameOriginMutation } from "~/lib/request-security.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    return loadCarEditPage({
        request,
        carIdParam: params.id,
        context: context,
    });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    assertSameOriginMutation(request);
    return submitCarEditAction({ request, context, params });
}

export default function EditCarPage() {
    const data = useLoaderData<typeof loader>();
    return <CarEditPageView {...data} />;
}
