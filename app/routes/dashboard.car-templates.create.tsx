import { drizzle } from 'drizzle-orm/d1'
import { redirect } from 'react-router'
import * as schema from '~/db/schema'
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

    const db = drizzle(context.cloudflare.env.DB, { schema })

    const brands = await db
        .select({
            id: schema.carBrands.id,
            name: schema.carBrands.name,
        })
        .from(schema.carBrands)
        .orderBy(schema.carBrands.name)
        .limit(100)

    const models = await db
        .select({
            id: schema.carModels.id,
            name: schema.carModels.name,
            brand_id: schema.carModels.brandId,
        })
        .from(schema.carModels)
        .orderBy(schema.carModels.name)
        .limit(500)

    const bodyTypes = await db
        .select({
            id: schema.bodyTypes.id,
            name: schema.bodyTypes.name,
        })
        .from(schema.bodyTypes)
        .orderBy(schema.bodyTypes.name)

    const fuelTypes = await db
        .select({
            id: schema.fuelTypes.id,
            name: schema.fuelTypes.name,
        })
        .from(schema.fuelTypes)
        .orderBy(schema.fuelTypes.name)

    return { brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData()
    const db = drizzle(context.cloudflare.env.DB, { schema })

    const data = {
        brand_id: formData.get('brand_id'),
        model_id: formData.get('model_id'),
        production_year: formData.get('production_year'),
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

    await db.insert(schema.carTemplates).values({
        brandId: Number(data.brand_id),
        modelId: Number(data.model_id),
        productionYear: data.production_year ? Number(data.production_year) : null,
        transmission: data.transmission as 'automatic' | 'manual' | null,
        engineVolume: data.engine_volume ? Number(data.engine_volume) : null,
        bodyTypeId: data.body_type ? Number(data.body_type) : null,
        seats: data.seats ? Number(data.seats) : null,
        doors: data.doors ? Number(data.doors) : null,
        fuelTypeId: data.fuel_type ? Number(data.fuel_type) : null,
        description: data.description as string | null,
        photos: data.photos as string | null,
    })

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
