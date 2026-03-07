import { redirect } from 'react-router'
import type { Route } from './+types/car-templates.$id'
import { requireScopedDashboardAccess } from '~/lib/access-policy.server'
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, params }: Route.LoaderArgs) {
    await requireScopedDashboardAccess(request, { allowAdminGlobal: true })
    const templateId = Number(params.id)
    const url = new URL(request.url)
    return redirect(`/car-templates/${templateId}/edit${url.search}`)
}

export default function CarTemplateRedirectPage() {
    useUrlToast();
    return null
}
