import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import CarContentPageView from "~/features/car-content/CarContentPageView";
import { submitCarContentAction } from "~/features/car-content/car-content.action.server";
import { loadCarContentPage } from "~/features/car-content/car-content.loader.server";
import { assertSameOriginMutation } from "~/lib/request-security.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  return loadCarContentPage({ request, context, carIdParam: params.id });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  assertSameOriginMutation(request);
  return submitCarContentAction({ request, context, carIdParam: params.id });
}

export default function CarContentManagementPage() {
  const data = useLoaderData<typeof loader>();
  return <CarContentPageView {...data} />;
}
