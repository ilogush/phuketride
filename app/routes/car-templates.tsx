import type { Route } from './+types/car-templates'
import { Link, redirect, useNavigate, useSearchParams } from 'react-router'
import { requireAdmin } from '~/lib/auth.server'
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
import { getRequestMetadata, quickAudit } from '~/lib/audit-logger'
import type { Column } from '~/components/dashboard/DataTable'
import { QUERY_LIMITS } from '~/lib/query-limits'
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

interface BrandRow {
    id: number
    name: string
    logo_url?: string | null
    created_at?: string
}

interface ModelRow {
    id: number
    name: string
    brand_id: number
    body_type_id?: number | null
    created_at?: string
    brand_name?: string | null
}

interface TemplateRow {
    id: number
    brand_id: number
    model_id: number
    transmission?: string | null
    engine_volume?: number | null
    body_type_id?: number | null
    seats?: number | null
    doors?: number | null
    fuel_type_id?: number | null
    photos?: string | null
    created_at?: string
    brand_name?: string | null
    model_name?: string | null
    fuel_type_name?: string | null
}

type BrandFormData = { name: string }
type ModelFormData = { name: string; brand_id: string }

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAdmin(request)

    const [brands, models, templates] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`SELECT id, name, logo_url, created_at FROM car_brands ORDER BY name ASC LIMIT ${QUERY_LIMITS.LARGE}`)
            .all()
            .then((r) => (r.results || []) as unknown as BrandRow[]),
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    cm.id,
                    cm.name,
                    cm.brand_id,
                    cm.body_type_id,
                    cm.created_at,
                    cb.name AS brand_name
                FROM car_models cm
                LEFT JOIN car_brands cb ON cb.id = cm.brand_id
                ORDER BY cm.name ASC
                LIMIT ${QUERY_LIMITS.XL}
            `)
            .all()
            .then((r) => (r.results || []) as unknown as ModelRow[]),
        context.cloudflare.env.DB
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
                    ft.name AS fuel_type_name
                FROM car_templates ct
                LEFT JOIN car_brands cb ON cb.id = ct.brand_id
                LEFT JOIN car_models cm ON cm.id = ct.model_id
                LEFT JOIN fuel_types ft ON ft.id = ct.fuel_type_id
                ORDER BY ct.created_at DESC
                LIMIT ${QUERY_LIMITS.LARGE}
            `)
            .all()
            .then((r) => (r.results || []) as unknown as TemplateRow[]),
    ])

    return { brands, models, templates }
}

export async function action({ request, context }: Route.ActionArgs) {
    const user = await requireAdmin(request)

    const formData = await request.formData()
    const parsedIntent = parseWithSchema(
        z.object({
            intent: z.enum(["create_brand", "delete_brand", "create_model", "delete_model", "delete_template"]),
        }),
        {
            intent: formData.get("intent"),
        },
        "Invalid intent"
    )
    if (!parsedIntent.ok) {
        return { error: 'Invalid intent' }
    }
    const intent = parsedIntent.data.intent
    const metadata = getRequestMetadata(request)
    // Brand actions
    if (intent === 'create_brand') {
        const name = formData.get('name') as string
        if (!name) {
            return { error: 'Brand name is required' }
        }
        await context.cloudflare.env.DB
            .prepare("INSERT INTO car_brands (name, created_at, updated_at) VALUES (?, ?, ?)")
            .bind(name, new Date().toISOString(), new Date().toISOString())
            .run()
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: 'brand',
            action: 'create',
            afterState: { name },
            ...metadata,
        })
        return { success: true, message: 'Brand created successfully' }
    }

    if (intent === 'delete_brand') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Brand ID is required' }
        }
        const brandId = Number(id)
        await context.cloudflare.env.DB.prepare("DELETE FROM car_brands WHERE id = ?").bind(brandId).run()
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: 'brand',
            entityId: brandId,
            action: 'delete',
            ...metadata,
        })
        return { success: true, message: 'Brand deleted successfully' }
    }

    // Model actions
    if (intent === 'create_model') {
        const name = formData.get('name') as string
        const brand_id = formData.get('brand_id') as string
        if (!name || !brand_id) {
            return { error: 'Model name and brand are required' }
        }
        await context.cloudflare.env.DB
            .prepare("INSERT INTO car_models (name, brand_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
            .bind(name, Number(brand_id), new Date().toISOString(), new Date().toISOString())
            .run()
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: 'model',
            action: 'create',
            afterState: { name, brandId: Number(brand_id) },
            ...metadata,
        })
        return { success: true, message: 'Model created successfully' }
    }

    if (intent === 'delete_model') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Model ID is required' }
        }
        const modelId = Number(id)
        await context.cloudflare.env.DB.prepare("DELETE FROM car_models WHERE id = ?").bind(modelId).run()
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: 'model',
            entityId: modelId,
            action: 'delete',
            ...metadata,
        })
        return { success: true, message: 'Model deleted successfully' }
    }

    // Template actions
    if (intent === 'delete_template') {
        const id = formData.get('id')
        if (!id) {
            return { error: 'Template ID is required' }
        }
        const templateId = Number(id)
        await context.cloudflare.env.DB.prepare("DELETE FROM car_templates WHERE id = ?").bind(templateId).run()
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: 'car_template',
            entityId: templateId,
            action: 'delete',
            ...metadata,
        })
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
            options: brands.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })),
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

    const handleBrandSubmit = async (data: Record<string, unknown>) => {
        const form = data as BrandFormData
        const formData = new FormData()
        formData.append('intent', 'create_brand')
        formData.append('name', form.name)

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

    const handleModelSubmit = async (data: Record<string, unknown>) => {
        const form = data as ModelFormData
        const formData = new FormData()
        formData.append('intent', 'create_model')
        formData.append('name', form.name)
        formData.append('brand_id', form.brand_id)

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

    const brandColumns: Column<BrandRow>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (brand) => <IdBadge>#{String(brand.id).padStart(3, "0")}</IdBadge>,
        },
        {
            key: 'name',
            label: 'Name',
            render: (brand) => (
                <span className="text-sm text-gray-900">{brand.name}</span>
            ),
        },
    ]

    const modelColumns: Column<ModelRow>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (model) => <IdBadge>#{String(model.id).padStart(3, "0")}</IdBadge>,
        },
        {
            key: 'brand',
            label: 'Brand',
            render: (model) => (
                <span className="text-sm text-gray-900">{model.brand_name}</span>
            ),
        },
        {
            key: 'name',
            label: 'Model',
            render: (model) => (
                <span className="text-sm text-gray-900">{model.name}</span>
            ),
        },
    ]

    const templateColumns: Column<TemplateRow>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (template) => (
                <Link to={`/car-templates/${template.id}`} className="hover:opacity-70 transition-opacity">
                    <IdBadge>#{String(template.id).padStart(3, "0")}</IdBadge>
                </Link>
            ),
        },
        {
            key: 'brand',
            label: 'Brand',
            render: (template) => (
                <span className="text-sm text-gray-900">{template.brand_name}</span>
            ),
        },
        {
            key: 'model',
            label: 'Model',
            render: (template) => (
                <span className="text-sm text-gray-900">{template.model_name}</span>
            ),
        },
        {
            key: 'fuel',
            label: 'Fuel',
            render: (template) => (
                <span className="text-sm text-gray-600">
                    {template.fuel_type_name || '-'}
                </span>
            ),
        },
        {
            key: 'transmission',
            label: 'Transmission',
            render: (template) => (
                <span className="text-sm text-gray-600 capitalize">
                    {template.transmission || '-'}
                </span>
            ),
        },
        {
            key: 'engine',
            label: 'Engine',
            render: (template) => (
                <span className="text-sm text-gray-600">
                    {template.engine_volume ? `${template.engine_volume}L` : '-'}
                </span>
            ),
        },
        {
            key: 'seats',
            label: 'Seats',
            render: (template) => (
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
