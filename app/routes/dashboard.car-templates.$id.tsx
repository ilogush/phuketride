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

    const templateId = Number(params.id)

    const template = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                ct.id,
                ct.brand_id,
                ct.model_id,
                ct.transmission,
                ct.engine_volume,
                ct.body_type_id,
                ct.seats,
                ct.doors,
                ct.fuel_type_id,
                ct.photos,
                ct.created_at,
                cb.name AS brand_name,
                cm.name AS model_name,
                bt.name AS body_type_name,
                ft.name AS fuel_type_name
            FROM car_templates ct
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN body_types bt ON bt.id = ct.body_type_id
            LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
            WHERE ct.id = ?
            LIMIT 1
        `)
        .bind(templateId)
        .first<any>()

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
