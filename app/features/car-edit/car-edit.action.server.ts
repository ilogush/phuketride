import type { ActionFunctionArgs } from "react-router";
import { getScopedDb } from "~/lib/db-factory.server";
import { requireAuth } from "~/lib/auth.server";

export async function submitCarEditAction(args: {
  request: Request;
  context: ActionFunctionArgs["context"];
  params: ActionFunctionArgs["params"];
}) {
  const { request, context, params } = args;
  const { user, sdb } = await getScopedDb(request, context as any);
  const formData = await request.formData();

  return sdb.cars.editAction({
    request,
    user,
    formData,
    params,
    assets: (context as any).cloudflare.env.ASSETS,
  });
}
