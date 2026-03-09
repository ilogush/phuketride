import type { ActionFunctionArgs } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";
import type { AppLoadContext } from "~/types/context";

export async function submitCarEditAction(args: {
  request: Request;
  context: AppLoadContext;
  params: ActionFunctionArgs["params"];
}) {
  const { request, context, params } = args;
  const { user, sdb } = await getScopedDb(request, context);
  const formData = await request.formData();

  return sdb.cars.editAction({
    request,
    user,
    formData,
    params,
    assets: context.cloudflare.env.ASSETS,
  });
}
