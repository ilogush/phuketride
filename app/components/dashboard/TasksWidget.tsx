import { useState } from 'react'
import { Link, Form } from 'react-router'
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable'
import Modal from '~/components/shared/ui/Modal'
import Button from '~/components/shared/ui/Button'
import DeleteButton from '~/components/shared/ui/DeleteButton'
import StatusBadge from '~/components/shared/ui/StatusBadge'
import IdBadge from '~/components/shared/ui/IdBadge'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import AdminCard from '~/components/shared/ui/AdminCard'

interface Task {
    id: string
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed'
    priority?: 'high' | 'medium' | 'low'
    relatedEntity?: {
        type: 'contract' | 'car' | 'payment' | 'user' | 'company'
        id: string | number
        label: string
    }
}

interface TasksWidgetProps {
    tasks: Task[]
}

export default function TasksWidget({ tasks }: TasksWidgetProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)

    if (!tasks || tasks.length === 0) {
        return null
    }

    const getEntityUrl = (entity: Task['relatedEntity']) => {
        if (!entity) return null

        const urlMap = {
            contract: `/contracts/${entity.id}/edit`,
            car: `/cars/${entity.id}/edit`,
            payment: `/payments/${entity.id}`,
            user: `/users/${entity.id}/edit`,
            company: `/companies/${entity.id}/edit`,
        }

        return urlMap[entity.type]
    }

    const columns: Column<Task>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (_, index) => <IdBadge>{String(index + 1).padStart(2, '0')}</IdBadge>,
        },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', wrap: true, className: 'min-w-[18rem]' },
        {
            key: 'status',
            label: 'Status',
            render: (task) => (
                <StatusBadge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning'}>
                    {task.status.replace('_', ' ')}
                </StatusBadge>
            ),
        },
        {
            key: 'priority',
            label: 'Priority',
            render: (task) => task.priority ? (
                <StatusBadge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'neutral'}>
                    {task.priority}
                </StatusBadge>
            ) : '-',
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (task) => (
                <Button
                    variant="plain"
                    size="sm"
                    onClick={() => setSelectedTask(task)}
                    className="ring-1 ring-gray-200 hover:ring-gray-300"
                >
                    View
                </Button>
            ),
        },
    ]

    return (
        <AdminCard
            title="My Tasks"
            icon={<ClipboardDocumentCheckIcon className="w-5 h-5" />}
            headerActions={
                <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                        {tasks.length}
                    </span>
                </div>
            }
        >
            <DataTable data={tasks} columns={columns} pagination={false} />

            {/* Task Details Modal */}
            {selectedTask && (
                <Modal
                    title="Task Details"
                    onClose={() => setSelectedTask(null)}
                    maxWidth="lg"
                    actions={
                        <div className="flex justify-end items-center gap-2 w-full">
                            <Form method="post" onSubmit={() => setSelectedTask(null)}>
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="taskId" value={selectedTask.id} />
                                <DeleteButton
                                    type="submit"
                                    title="Delete Task"
                                />
                            </Form>
                            <Button
                                variant="solid"
                                onClick={() => setSelectedTask(null)}
                                className="px-8"
                            >
                                Close
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Task ID
                            </label>
                            <p className="text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg">
                                {selectedTask.id}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                            </label>
                            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                                {selectedTask.title}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg min-h-[80px] whitespace-pre-wrap">
                                {selectedTask.description}
                            </p>
                        </div>

                        {selectedTask.relatedEntity && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Related {selectedTask.relatedEntity.type}
                                </label>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg flex-1">
                                        {selectedTask.relatedEntity.label}
                                    </p>
                                    <Link to={getEntityUrl(selectedTask.relatedEntity) || '#'}>
                                        <Button variant="outline" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <div className="flex items-center gap-2">
                                    <StatusBadge variant={selectedTask.status === 'completed' ? 'success' : selectedTask.status === 'in_progress' ? 'info' : 'warning'}>
                                        {selectedTask.status.replace('_', ' ')}
                                    </StatusBadge>
                                </div>
                            </div>

                            {selectedTask.priority && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge variant={selectedTask.priority === 'high' ? 'error' : selectedTask.priority === 'medium' ? 'warning' : 'neutral'}>
                                            {selectedTask.priority}
                                        </StatusBadge>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </AdminCard>
    )
}
