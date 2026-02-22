import { redirect } from 'react-router'
import type { Route } from './+types/dashboard.car-templates.create'
import { requireAuth } from '~/lib/auth.server'
import { CarTemplateForm } from '~/components/dashboard/CarTemplateForm'
import PageHeader from '~/components/dashboard/PageHeader'
import BackButton from '~/components/dashboard/BackButton'
import Button from '~/components/dashboard/Button'

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAuth(request)
    
    if (user.role !== 'admin') {
        throw new Response('Forbidden', { status: 403 })
    }

    const [brands, models, bodyTypes, fuelTypes] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT id, name FROM car_brands ORDER BY name ASC LIMIT 100").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name, brand_id FROM car_models ORDER BY name ASC LIMIT 500").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name FROM body_types ORDER BY name ASC").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT id, name FROM fuel_types ORDER BY name ASC").all().then((r: any) => r.results || []),
    ])

    return { brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData()
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
            INSERT INTO car_templates (
                brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors,
                fuel_type_id, description, photos, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            new Date().toISOString()
        )
        .run()

    return redirect('/car-templates')
}

export default function CreateCarTemplatePage({ loaderData }: Route.ComponentProps) {
    const { brands, models, bodyTypes, fuelTypes } = loaderData

    return (
        <div className="space-y-4">
            <PageHeader
                title="Create"
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Button type="submit" variant="primary" form="car-template-form">
                        Create
                    </Button>
                }
            />

            <CarTemplateForm brands={brands} models={models} bodyTypes={bodyTypes} fuelTypes={fuelTypes} />
        </div>
    )
}
