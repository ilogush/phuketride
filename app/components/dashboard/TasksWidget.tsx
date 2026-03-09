import { useState } from 'react'
import { Link, Form } from 'react-router'
import Modal from '~/components/shared/ui/Modal'
import Button from '~/components/shared/ui/Button'
import DeleteButton from '~/components/shared/ui/DeleteButton'
import { TrashIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
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

const STATUS_STYLES = {
    pending: 'text-yellow-700 bg-yellow-50 border-yellow-100',
    in_progress: 'text-blue-700 bg-blue-50 border-blue-100',
    completed: 'text-green-700 bg-green-50 border-green-100',
}

const PRIORITY_STYLES = {
    high: 'text-red-700 bg-red-50 border-red-100',
    medium: 'text-orange-700 bg-orange-50 border-orange-100',
    low: 'text-gray-700 bg-gray-50 border-gray-100',
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
            {/* Tasks Table */}
            <div className="overflow-x-auto -mx-4 -mb-4">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                        <tr className="bg-white">
                            <th scope="col" className="pl-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100 rounded-tl-2xl">
                                №
                            </th>
                            <th scope="col" className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100">
                                Title
                            </th>
                            <th scope="col" className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100">
                                Description
                            </th>
                            <th scope="col" className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100">
                                Status
                            </th>
                            <th scope="col" className="px-4 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100">
                                Priority
                            </th>
                            <th scope="col" className="pr-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none border-b border-gray-100 rounded-tr-2xl">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.map((task, index) => (
                            <tr key={task.id} className="group hover:bg-gray-50 transition-colors">
                                <td className="pl-6 py-4 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className="font-mono text-[11px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className="font-bold">{task.title}</span>
                                </td>
                                <td className="px-4 py-4 text-[13px] text-gray-500 whitespace-normal align-middle max-w-md leading-relaxed">
                                    {task.description}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${STATUS_STYLES[task.status]}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    {task.priority && (
                                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${PRIORITY_STYLES[task.priority]}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="pr-6 py-4 text-sm text-gray-900 whitespace-nowrap align-middle text-right">
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        onClick={() => setSelectedTask(task)}
                                        className="ring-1 ring-gray-200 hover:ring-gray-300"
                                    >
                                        View
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                                    <span className={`inline-flex items-center px-3 py-2 text-sm font-medium tracking-wide rounded-lg border ${STATUS_STYLES[selectedTask.status]}`}>
                                        {selectedTask.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {selectedTask.priority && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-3 py-2 text-sm font-medium tracking-wide rounded-lg border ${PRIORITY_STYLES[selectedTask.priority]}`}>
                                            {selectedTask.priority}
                                        </span>
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
