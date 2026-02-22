import { redirect } from 'react-router'
import type { Route } from './+types/dashboard.car-templates.$id.edit'
import { requireAuth } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/CarTemplateForm'
import PageHeader from '~/components/dashboard/PageHeader'
import BackButton from '~/components/dashboard/BackButton'
import Button from '~/components/dashboard/Button'

export async function loader({ request, context, params }: Route.LoaderArgs) {
    const user = await requireAuth(request)
    
    if (user.role !== 'admin') {
        throw new Response('Forbidden', { status: 403 })
    }

    const templateId = Number(params.id)

    const template = await context.cloudflare.env.DB
        .prepare("SELECT * FROM car_templates WHERE id = ? LIMIT 1")
        .bind(templateId)
        .first<any>()

    if (!template) {
        throw new Response('Template not found', { status: 404 })
    }

    const [brands, models, bodyTypes, fuelTypes] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT id, name FROM car_brands ORDER BY name ASC LIMIT 100").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name, brand_id FROM car_models ORDER BY name ASC LIMIT 500").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name FROM body_types ORDER BY name ASC").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name FROM fuel_types ORDER BY name ASC").all().then((r: any) => r.results || []),
    ])

    return { template, brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context, params }: Route.ActionArgs) {
    const formData = await request.formData()
    const templateId = Number(params.id)

    const data = {
        brand_id: formData.get('brand_id'),
        model_id: formData.get('model_id'),
        transmission: formData.get('transmission'),
        engine_volume: formData.get('engine_volume'),
        body_type: formData.get('body_type'),
        seats: formData.get('seats'),
        doors: formData.get('doors'),
        fuel_type: formData.get('fuel_type'),
        description: formData.get('description'),
        photos: formData.get('photos'),
    }

    if (!data.brand_id || !data.model_id) {
        return { error: 'Brand and model are required' }
    }

    await context.cloudflare.env.DB
        .prepare(`
            UPDATE car_templates
            SET brand_id = ?, model_id = ?, transmission = ?, engine_volume = ?, body_type_id = ?,
                seats = ?, doors = ?, fuel_type_id = ?, description = ?, photos = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(
            Number(data.brand_id),
            Number(data.model_id),
            data.transmission,
            data.engine_volume ? Number(data.engine_volume) : null,
            data.body_type ? Number(data.body_type) : null,
            data.seats ? Number(data.seats) : null,
            data.doors ? Number(data.doors) : null,
            data.fuel_type ? Number(data.fuel_type) : null,
            data.description as string | null,
            data.photos as string | null,
            new Date().toISOString(),
            templateId
        )
        .run()

    return redirect(`/car-templates/${templateId}`)
}

export default function EditCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { template, brands, models, bodyTypes, fuelTypes } = loaderData

    return (
        <div className="space-y-4">
            <PageHeader
                title="Edit"
                leftActions={<BackButton to={`/car-templates/${template.id}`} />}
                rightActions={
                    <Button type="submit" variant="primary" form="car-template-form">
                        Save
                    </Button>
                }
            />

            <CarTemplateForm
                brands={brands}
                models={models}
                bodyTypes={bodyTypes}
                fuelTypes={fuelTypes}
                defaultValues={{
                    brand_id: template.brand_id,
                    model_id: template.model_id,
                    transmission: template.transmission,
                    engine_volume: template.engine_volume,
                    body_type: template.body_type_id,
                    seats: template.seats,
                    doors: template.doors,
                    fuel_type: template.fuel_type_id,
                    description: template.description,
                    photos: template.photos,
                }}
            />
        </div>
    )
}
