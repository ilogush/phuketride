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

  return handleEditCarAction({ request, context, user, params, formData });
}
