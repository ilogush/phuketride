import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import * as schema from '~/db/schema'
import type { Route } from './+types/dashboard.car-templates'
import { Link, redirect, useNavigate, useSearchParams } from 'react-router'
import { requireAuth } from '~/lib/auth.server'
import PageHeader from '~/components/dashboard/PageHeader'
import Button from '~/components/dashboard/Button'
import DataTable from '~/components/dashboard/DataTable'
import EmptyState from '~/components/dashboard/EmptyState'
import Tabs from '~/components/dashboard/Tabs'
import Modal from '~/components/dashboard/Modal'
import IdBadge from '~/components/dashboard/IdBadge'
import { PlusIcon, TruckIcon, TagIcon, CubeIcon } from '@heroicons/react/24/outline'
import { GenericDictionaryForm, type FieldConfig } from '~/components/dashboard/GenericDictionaryForm'
import { useState } from 'react'
import { useToast } from '~/lib/toast'

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAuth(request)
    
    if (user.role !== 'admin') {
        throw new Response('Forbidden', { status: 403 })
    }

    const db = drizzle(context.cloudflare.env.DB, { schema })

    // Load brands
    const brands = await db
        .select({
            id: schema.carBrands.id,
            name: schema.carBrands.name,
            logo_url: schema.carBrands.logoUrl,
            created_at: schema.carBrands.createdAt,
        })
        .from(schema.carBrands)
        .orderBy(schema.carBrands.name)
        .limit(100)

    // Load models
    const models = await db
        .select({
            id: schema.carModels.id,
            name: schema.carModels.name,
            brand_id: schema.carModels.brandId,
            body_type_id: schema.carModels.bodyTypeId,
            created_at: schema.carModels.createdAt,
            brand_name: schema.carBrands.name,
        })
        .from(schema.carModels)
        .leftJoin(schema.carBrands, eq(schema.carModels.brandId, schema.carBrands.id))
        .orderBy(schema.carModels.name)
        .limit(200)

    // Load templates
    const templates = await db
        .select({
            id: schema.carTemplates.id,
            brand_id: schema.carTemplates.brandId,
            model_id: schema.carTemplates.modelId,
            production_year: schema.carTemplates.productionYear,
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
        })
        .from(schema.carTemplates)
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .orderBy(desc(schema.carTemplates.createdAt))
        .limit(100)

    return { brands, models, templates }
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData()
    const intent = formData.get('intent')
    const db = drizzle(context.cloudflare.env.DB, { schema })

    // Brand actions
    if (intent === 'create_brand') {
        const name = formData.get('name') as string
        if (!name) {
            return { error: 'Brand name is required' }
        }
        await db.insert(schema.carBrands).values({ name })
        return { success: true, message: 'Brand created successfully' }
    }

    if (intent === 'delete_brand') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Brand ID is required' }
        }
        await db.delete(schema.carBrands).where(eq(schema.carBrands.id, Number(id)))
        return { success: true, message: 'Brand deleted successfully' }
    }

    // Model actions
    if (intent === 'create_model') {
        const name = formData.get('name') as string
        const brand_id = formData.get('brand_id') as string
        if (!name || !brand_id) {
            return { error: 'Model name and brand are required' }
        }
        await db.insert(schema.carModels).values({
            name,
            brandId: Number(brand_id),
        })
        return { success: true, message: 'Model created successfully' }
    }

    if (intent === 'delete_model') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Model ID is required' }
        }
        await db.delete(schema.carModels).where(eq(schema.carModels.id, Number(id)))
        return { success: true, message: 'Model deleted successfully' }
    }

    // Template actions
    if (intent === 'delete_template') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Template ID is required' }
        }
        await db.delete(schema.carTemplates).where(eq(schema.carTemplates.id, Number(id)))
        return { success: true, message: 'Template deleted successfully' }
    }

    return { error: 'Invalid intent' }
}

export default function CarTemplatesPage({ loaderData }: Route.ComponentProps) {
    const { brands, models, templates } = loaderData
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const activeTab = searchParams.get('tab') || 'templates'
    const [showBrandModal, setShowBrandModal] = useState(false)
    const [showModelModal, setShowModelModal] = useState(false)
    const toast = useToast()

    type ActionResult = { success?: boolean; message?: string; error?: string }

    const brandFields: FieldConfig[] = [
        {
            name: 'name',
            label: 'Brand Name',
            type: 'text',
            required: true,
            placeholder: 'Enter brand name',
            className: 'col-span-4'
        }
    ]

    const modelFields: FieldConfig[] = [
        {
            name: 'brand_id',
            label: 'Brand',
            type: 'select',
            required: true,
            options: brands.map(b => ({ id: b.id, name: b.name })),
            className: 'col-span-2'
        },
        {
            name: 'name',
            label: 'Model Name',
            type: 'text',
            required: true,
            placeholder: 'Enter model name',
            className: 'col-span-2'
        }
    ]

    const tabs = [
        { id: 'templates', label: 'Car Templates' },
        { id: 'brands', label: 'Brands' },
        { id: 'models', label: 'Models' },
    ]

    const handleBrandSubmit = async (data: any) => {
        const formData = new FormData()
        formData.append('intent', 'create_brand')
        formData.append('name', data.name)

        try {
            const response = await fetch('/car-templates', {
                method: 'POST',
                body: formData,
            })
            const result = (await response.json()) as ActionResult
            if (result.success) {
                await toast.success(result.message || 'Brand created successfully')
                setShowBrandModal(false)
                window.location.reload()
            } else {
                await toast.error(result.error || 'Failed to create brand')
            }
        } catch (error) {
            await toast.error('Failed to create brand')
        }
    }

    const handleModelSubmit = async (data: any) => {
        const formData = new FormData()
        formData.append('intent', 'create_model')
        formData.append('name', data.name)
        formData.append('brand_id', data.brand_id)

        try {
            const response = await fetch('/car-templates', {
                method: 'POST',
                body: formData,
            })
            const result = (await response.json()) as ActionResult
            if (result.success) {
                await toast.success(result.message || 'Model created successfully')
                setShowModelModal(false)
                window.location.reload()
            } else {
                await toast.error(result.error || 'Failed to create model')
            }
        } catch (error) {
            await toast.error('Failed to create model')
        }
    }

    const brandColumns = [
        {
            key: 'id',
            label: 'ID',
            render: (brand: any) => <IdBadge>#{brand.id}</IdBadge>,
        },
        {
            key: 'name',
            label: 'Name',
            render: (brand: any) => (
                <span className="text-sm text-gray-900">{brand.name}</span>
            ),
        },
    ]

    const modelColumns = [
        {
            key: 'id',
            label: 'ID',
            render: (model: any) => <IdBadge>#{model.id}</IdBadge>,
        },
        {
            key: 'brand',
            label: 'Brand',
            render: (model: any) => (
                <span className="text-sm text-gray-900">{model.brand_name}</span>
            ),
        },
        {
            key: 'name',
            label: 'Model',
            render: (model: any) => (
                <span className="text-sm text-gray-900">{model.name}</span>
            ),
        },
    ]

    const templateColumns = [
        {
            key: 'id',
            label: 'ID',
            render: (template: any) => (
                <Link to={`/car-templates/${template.id}`} className="hover:opacity-70 transition-opacity">
                    <IdBadge>#{template.id}</IdBadge>
                </Link>
            ),
        },
        {
            key: 'brand',
            label: 'Brand',
            render: (template: any) => (
                <span className="text-sm text-gray-900">{template.brand_name}</span>
            ),
        },
        {
            key: 'model',
            label: 'Model',
            render: (template: any) => (
                <span className="text-sm text-gray-900">{template.model_name}</span>
            ),
        },
        {
            key: 'year',
            label: 'Year',
            render: (template: any) => (
                <span className="text-sm text-gray-600">{template.production_year || '-'}</span>
            ),
        },
        {
            key: 'transmission',
            label: 'Transmission',
            render: (template: any) => (
                <span className="text-sm text-gray-600 capitalize">
                    {template.transmission || '-'}
                </span>
            ),
        },
        {
            key: 'engine',
            label: 'Engine',
            render: (template: any) => (
                <span className="text-sm text-gray-600">
                    {template.engine_volume ? `${template.engine_volume}L` : '-'}
                </span>
            ),
        },
        {
            key: 'seats',
            label: 'Seats',
            render: (template: any) => (
                <span className="text-sm text-gray-600">
                    {template.seats ? `${template.seats} seats` : '-'}
                </span>
            ),
        },
    ]

    return (
        <div className="space-y-4">
            <PageHeader
                title="Car Management"
                rightActions={
                    activeTab === 'brands' ? (
                        <Button
                            variant="primary"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setShowBrandModal(true)}
                        >
                            Add Brand
                        </Button>
                    ) : activeTab === 'models' ? (
                        <Button
                            variant="primary"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setShowModelModal(true)}
                        >
                            Add Model
                        </Button>
                    ) : (
                        <Link to="/car-templates/create">
                            <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                                Create
                            </Button>
                        </Link>
                    )
                }
            />

            <Tabs 
                tabs={tabs} 
                activeTab={activeTab} 
                baseUrl="/car-templates"
            />

            {activeTab === 'brands' && (
                <>
                    {brands.length === 0 ? (
                        <EmptyState
                            icon={<TagIcon className="w-12 h-12" />}
                            title="No brands"
                            description="Create your first car brand"
                            action={{ label: 'Add Brand', onClick: () => setShowBrandModal(true) }}
                        />
                    ) : (
                        <DataTable columns={brandColumns} data={brands} />
                    )}
                </>
            )}

            {activeTab === 'models' && (
                <>
                    {models.length === 0 ? (
                        <EmptyState
                            icon={<CubeIcon className="w-12 h-12" />}
                            title="No models"
                            description="Create your first car model"
                            action={{ label: 'Add Model', onClick: () => setShowModelModal(true) }}
                        />
                    ) : (
                        <DataTable columns={modelColumns} data={models} />
                    )}
                </>
            )}

            {activeTab === 'templates' && (
                <>
                    {templates.length === 0 ? (
                        <EmptyState
                            icon={<TruckIcon className="w-12 h-12" />}
                            title="No car templates"
                            description="Create your first car template"
                            action={{ label: 'Create', onClick: () => navigate('/car-templates/create') }}
                        />
                    ) : (
                        <DataTable
                            columns={templateColumns}
                            data={templates}
                        />
                    )}
                </>
            )}

            {showBrandModal && (
                <GenericDictionaryForm
                    title="Create Brand"
                    fields={brandFields}
                    onSubmit={handleBrandSubmit}
                    onCancel={() => setShowBrandModal(false)}
                />
            )}

            {showModelModal && (
                <GenericDictionaryForm
                    title="Create Car Model"
                    fields={modelFields}
                    onSubmit={handleModelSubmit}
                    onCancel={() => setShowModelModal(false)}
                />
            )}
        </div>
    )
}
