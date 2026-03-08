import type { Route } from './+types/car-templates'
import { Link, useNavigate, useSearchParams, useNavigation, type MetaFunction } from 'react-router'

export const meta: MetaFunction = () => [
    { title: "Car Templates — Phuket Ride Admin" },
    { name: "description", content: "Manage car brands, models, and technical templates." },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from '~/components/dashboard/PageHeader'
import Button from '~/components/dashboard/Button'
import DataTable from '~/components/dashboard/DataTable'
import EmptyState from '~/components/dashboard/EmptyState'
import Tabs from '~/components/dashboard/Tabs'
import IdBadge from '~/components/dashboard/IdBadge'
import { PlusIcon, TruckIcon, TagIcon, CubeIcon } from '@heroicons/react/24/outline'
import { GenericDictionaryForm, type FieldConfig } from '~/components/dashboard/GenericDictionaryForm'
import { useState } from 'react'
import { getRequestMetadata } from '~/lib/audit-logger'
import type { Column } from '~/components/dashboard/DataTable'
import type { BrandRow, ModelRow, TemplateRow } from "~/lib/car-templates";
import { useAsyncToastAction } from '~/lib/useAsyncToastAction'

type BrandFormData = { name: string }
type ModelFormData = { name: string; brand_id: string }

import { getScopedDb } from "~/lib/db-factory.server"
import { trackServerOperation } from "~/lib/telemetry.server"

export async function loader({ request, context }: Route.LoaderArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context)

    return trackServerOperation({
        event: "car_templates.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "car-templates" },
        run: async () => {
            const { brands, models, templates } = await sdb.carTemplates.list()
            return { brands, models, templates }
        },
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context)
    const formData = await request.formData()
    const metadata = getRequestMetadata(request)

    return sdb.carTemplates.handleAction({
        user,
        companyId,
        formData,
        metadata,
    })
}

export default function CarTemplatesPage({ loaderData }: Route.ComponentProps) {
    const { brands, models, templates } = loaderData
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const navigation = useNavigation()
    const activeTab = searchParams.get('tab') || 'templates'
    const [showBrandModal, setShowBrandModal] = useState(false)
    const [showModelModal, setShowModelModal] = useState(false)
    const { run } = useAsyncToastAction()

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

        await run(
            async () => {
                const response = await fetch('/car-templates', {
                    method: 'POST',
                    body: formData,
                })
                const result = (await response.json()) as ActionResult
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create brand')
                }
                return result
            },
            {
                successMessage: 'Brand created successfully',
                errorMessage: 'Failed to create brand',
                getSuccessMessage: (result) => result.message,
                onSuccess: () => {
                    setShowBrandModal(false)
                    window.location.reload()
                },
            }
        )
    }

    const handleModelSubmit = async (data: Record<string, unknown>) => {
        const form = data as ModelFormData
        const formData = new FormData()
        formData.append('intent', 'create_model')
        formData.append('name', form.name)
        formData.append('brand_id', form.brand_id)

        await run(
            async () => {
                const response = await fetch('/car-templates', {
                    method: 'POST',
                    body: formData,
                })
                const result = (await response.json()) as ActionResult
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create model')
                }
                return result
            },
            {
                successMessage: 'Model created successfully',
                errorMessage: 'Failed to create model',
                getSuccessMessage: (result) => result.message,
                onSuccess: () => {
                    setShowModelModal(false)
                    window.location.reload()
                },
            }
        )
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
                title="Car"
                rightActions={
                    activeTab === 'brands' ? (
                        <Button
                            variant="solid"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setShowBrandModal(true)}
                        >
                            Add Brand
                        </Button>
                    ) : activeTab === 'models' ? (
                        <Button
                            variant="solid"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setShowModelModal(true)}
                        >
                            Add Model
                        </Button>
                    ) : (
                        <Link to="/car-templates/create">
                            <Button variant="solid" icon={<PlusIcon className="w-5 h-5" />}>
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
                        <DataTable columns={brandColumns} data={brands} isLoading={navigation.state === "loading"} />
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
                        <DataTable columns={modelColumns} data={models} isLoading={navigation.state === "loading"} />
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
                            isLoading={navigation.state === "loading"}
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
