import { redirect } from 'react-router'
import type { Route } from './+types/car-templates.$id.edit'
import { requireAdmin } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/car-template-form/CarTemplateForm'
import PageHeader from '~/components/shared/ui/PageHeader'
import BackButton from '~/components/shared/ui/BackButton'
import Button from '~/components/shared/ui/Button'
import {
    loadCarTemplateFormOptions,
    loadEditableCarTemplate,
    updateCarTemplate,
} from '~/lib/car-template-form.server'

export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request)

    const templateId = Number(params.id)
    const [template, options] = await Promise.all([
        loadEditableCarTemplate(context.cloudflare.env.DB, templateId),
        loadCarTemplateFormOptions(context.cloudflare.env.DB),
    ])

    if (!template) {
        throw new Response('Template not found', { status: 404 })
    }

    return { template, ...options }
}

export async function action({ request, context, params }: Route.ActionArgs) {
    await requireAdmin(request)

    const formData = await request.formData()
    const templateId = Number(params.id)
    const parsed = await updateCarTemplate(context.cloudflare.env.DB, templateId, formData)
    if (!parsed.ok) {
        return redirect(`/car-templates/${templateId}/edit?error=${encodeURIComponent(parsed.error)}`)
    }
    return redirect(`/car-templates/${templateId}/edit?success=Template%20updated`)
}

export default function EditCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { template, brands, models, bodyTypes, fuelTypes } = loaderData
    const formTemplate = {
        ...template,
        transmission: template.transmission || undefined,
        engine_volume: template.engine_volume ?? undefined,
        body_type_id: template.body_type_id ?? undefined,
        seats: template.seats ?? undefined,
        doors: template.doors ?? undefined,
        fuel_type_id: template.fuel_type_id ?? undefined,
        description: template.description ?? undefined,
        photos: template.photos ?? undefined,
        feature_transmission: template.feature_transmission || undefined,
        feature_air_conditioning: Boolean(template.feature_air_conditioning),
        air_conditioning_price_per_day: template.air_conditioning_price_per_day ?? undefined,
        max_air_conditioning_price: template.max_air_conditioning_price ?? undefined,
        feature_abs: Boolean(template.feature_abs),
        feature_airbags: Boolean(template.feature_airbags),
        drivetrain: template.drivetrain || undefined,
        luggage_capacity: template.luggage_capacity || undefined,
        rear_camera: template.rear_camera == null ? true : Boolean(template.rear_camera),
        bluetooth_enabled: template.bluetooth_enabled == null ? true : Boolean(template.bluetooth_enabled),
        carplay_enabled: template.carplay_enabled == null ? false : Boolean(template.carplay_enabled),
        android_auto_enabled: template.android_auto_enabled == null ? false : Boolean(template.android_auto_enabled),
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="solid" form="car-template-form">
                        Save
                    </Button>
                }
            />

            <CarTemplateForm
                template={formTemplate}
                brands={brands}
                models={models}
                bodyTypes={bodyTypes}
                fuelTypes={fuelTypes}
            />
        </div>
    )
}
