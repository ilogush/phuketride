import type { ActionFunctionArgs } from "react-router";

import { requireAuth } from "~/lib/auth.server";
import { handleEditCarAction } from "~/lib/cars-edit-action.server";

export async function submitCarEditAction(args: {
  request: Request;
  context: ActionFunctionArgs["context"];
  params: ActionFunctionArgs["params"];
}) {
  const { request, context, params } = args;
  const user = await requireAuth(request);
  const formData = await request.formData();

  return handleEditCarAction({
    db: context.cloudflare.env.DB,
    assets: context.cloudflare.env.ASSETS,
    request,
    context,
    user,
    params,
    formData
  });
}
