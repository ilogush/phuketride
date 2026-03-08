import { redirect } from 'react-router'
import type { Route } from './+types/car-templates.create'
import { requireAdmin } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/CarTemplateForm'
import PageHeader from '~/components/dashboard/PageHeader'
import BackButton from '~/components/dashboard/BackButton'
import Button from '~/components/dashboard/Button'
import { createCarTemplate, loadCarTemplateFormOptions } from '~/lib/car-template-form.server'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request)
    return loadCarTemplateFormOptions(context.cloudflare.env.DB)
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request)
    const formData = await request.formData()
    const parsed = await createCarTemplate(context.cloudflare.env.DB, formData)
    if (!parsed.ok) {
        return redirect(`/car-templates/create?error=${encodeURIComponent(parsed.error)}`)
    }
    return redirect('/car-templates?success=Template%20created')
}

export default function CreateCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { brands, models, bodyTypes, fuelTypes } = loaderData

    return (
        <div className="space-y-4">
            <PageHeader
                title="Create"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="solid" form="car-template-form">
                        Create
                    </Button>
                }
            />

            <CarTemplateForm brands={brands} models={models} bodyTypes={bodyTypes} fuelTypes={fuelTypes} />
        </div>
    )
}
