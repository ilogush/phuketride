import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from '~/db/schema'
import type { Route } from './+types/dashboard.car-templates.$id'
import { Link } from 'react-router'
import { requireAuth } from '~/lib/auth.server'
import PageHeader from '~/components/dashboard/PageHeader'
import Button from '~/components/dashboard/Button'
import Card from '~/components/dashboard/Card'
import IdBadge from '~/components/dashboard/IdBadge'
import BackButton from '~/components/dashboard/BackButton'
import LazyImage from '~/components/dashboard/LazyImage'
import { PencilIcon } from '@heroicons/react/24/outline'

export async function loader({ request, context, params }: Route.LoaderArgs) {
    const user = await requireAuth(request)
    
    if (user.role !== 'admin') {
        throw new Response('Forbidden', { status: 403 })
    }

    const db = drizzle(context.cloudflare.env.DB, { schema })
    const templateId = Number(params.id)

    const [template] = await db
        .select({
            id: schema.carTemplates.id,
            brand_id: schema.carTemplates.brandId,
            model_id: schema.carTemplates.modelId,
            transmission: schema.carTemplates.transmission,
            engine_volume: schema.carTemplates.engineVolume,
            body_type_id: schema.carTemplates.bodyTypeId,
            seats: schema.carTemplates.seats,
            doors: schema.carTemplates.doors,
            fuel_type_id: schema.carTemplates.fuelTypeId,
            photos: schema.carTemplates.photos,
            created_at: schema.carTemplates.createdAt,
            brand_name: schema.carBrands.name,
            model_name: schema.carModels.name,
            body_type_name: schema.bodyTypes.name,
            fuel_type_name: schema.fuelTypes.name,
        })
        .from(schema.carTemplates)
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .leftJoin(schema.bodyTypes, eq(schema.carTemplates.bodyTypeId, schema.bodyTypes.id))
        .leftJoin(schema.fuelTypes, eq(schema.carTemplates.fuelTypeId, schema.fuelTypes.id))
        .where(eq(schema.carTemplates.id, templateId))
        .limit(1)

    if (!template) {
        throw new Response('Template not found', { status: 404 })
    }

    return { template }
}

export default function CarTemplateDetailPage({ loaderData }: Route.ComponentProps) {
    const { template } = loaderData
    const photos = template.photos ? JSON.parse(template.photos as string) : []

    return (
        <div className="space-y-4">
            <PageHeader
                title={`${template.brand_name} ${template.model_name}`}
                leftActions={<BackButton to="/car-templates" />}
                rightActions={
                    <Link to={`/car-templates/${template.id}/edit`}>
                        <Button variant="primary" icon={<PencilIcon className="w-5 h-5" />}>
                            Edit
                        </Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <Card title="Template Information">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500">ID</label>
                                <div className="mt-1">
                                    <IdBadge>#{template.id}</IdBadge>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Brand</label>
                                <p className="text-sm text-gray-900 mt-1">{template.brand_name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Model</label>
                                <p className="text-sm text-gray-900 mt-1">{template.model_name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Body Type</label>
                                <p className="text-sm text-gray-900 mt-1">{template.body_type_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Fuel Type</label>
                                <p className="text-sm text-gray-900 mt-1">{template.fuel_type_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Transmission</label>
                                <p className="text-sm text-gray-900 mt-1 capitalize">{template.transmission || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Engine Volume</label>
                                <p className="text-sm text-gray-900 mt-1">
                                    {template.engine_volume ? `${template.engine_volume}L` : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Seats</label>
                                <p className="text-sm text-gray-900 mt-1">{template.seats || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Doors</label>
                                <p className="text-sm text-gray-900 mt-1">{template.doors || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Created</label>
                                <p className="text-sm text-gray-900 mt-1">
                                    {new Date(template.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card title="Photos">
                        {photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {photos.map((photo: string, index: number) => (
                                    <LazyImage
                                        key={index}
                                        src={photo}
                                        alt={`${template.brand_name} ${template.model_name} - Photo ${index + 1}`}
                                        className="w-full h-24 object-cover rounded"
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No photos</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}
