import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { redirect } from 'react-router'
import * as schema from '~/db/schema'
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

    const db = drizzle(context.cloudflare.env.DB, { schema })
    const templateId = Number(params.id)

    const [template] = await db
        .select()
        .from(schema.carTemplates)
        .where(eq(schema.carTemplates.id, templateId))
        .limit(1)

    if (!template) {
        throw new Response('Template not found', { status: 404 })
    }

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

    return { template, brands, models, bodyTypes, fuelTypes }
}

export async function action({ request, context, params }: Route.ActionArgs) {
    const formData = await request.formData()
    const db = drizzle(context.cloudflare.env.DB, { schema })
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

    await db
        .update(schema.carTemplates)
        .set({
            brandId: Number(data.brand_id),
            modelId: Number(data.model_id),
            transmission: data.transmission as 'automatic' | 'manual' | null,
            engineVolume: data.engine_volume ? Number(data.engine_volume) : null,
            bodyTypeId: data.body_type ? Number(data.body_type) : null,
            seats: data.seats ? Number(data.seats) : null,
            doors: data.doors ? Number(data.doors) : null,
            fuelTypeId: data.fuel_type ? Number(data.fuel_type) : null,
            description: data.description as string | null,
            photos: data.photos as string | null,
        })
        .where(eq(schema.carTemplates.id, templateId))

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
                    brand_id: template.brandId,
                    model_id: template.modelId,
                    transmission: template.transmission,
                    engine_volume: template.engineVolume,
                    body_type: template.bodyTypeId,
                    seats: template.seats,
                    doors: template.doors,
                    fuel_type: template.fuelTypeId,
                    description: template.description,
                    photos: template.photos,
                }}
            />
        </div>
    )
}
