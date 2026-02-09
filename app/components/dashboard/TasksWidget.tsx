import { useState } from 'react'
import { Link } from 'react-router'
import Modal from './Modal'
import Button from './Button'

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
    onDelete?: (taskId: string) => void
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

export default function TasksWidget({ tasks, onDelete }: TasksWidgetProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)

    if (!tasks || tasks.length === 0) {
        return null
    }

    const handleDelete = (taskId: string) => {
        if (onDelete) {
            onDelete(taskId)
        }
        setSelectedTask(null)
    }

    const getEntityUrl = (entity: Task['relatedEntity']) => {
        if (!entity) return null
        
        const urlMap = {
            contract: `/contracts/${entity.id}`,
            car: `/cars/${entity.id}`,
            payment: `/payments/${entity.id}`,
            user: `/users/${entity.id}`,
            company: `/companies/${entity.id}`,
        }
        
        return urlMap[entity.type]
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex justify-between items-center bg-gray-50/50 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">My Tasks</h2>
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Tasks Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th scope="col" className="pl-4 py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase">
                                №
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase">
                                Title
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase">
                                Description
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase">
                                Status
                            </th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-normal text-gray-500 tracking-tight uppercase">
                                Priority
                            </th>
                            <th scope="col" className="pr-4 py-2 text-right text-xs font-normal text-gray-500 tracking-tight uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.map((task, index) => (
                            <tr key={task.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="pl-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className="font-medium">{task.title}</span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 whitespace-normal align-middle max-w-md">
                                    {task.description}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium tracking-wide rounded-lg border ${STATUS_STYLES[task.status]}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    {task.priority && (
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium tracking-wide rounded-lg border ${PRIORITY_STYLES[task.priority]}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="pr-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDelete(task.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
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
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => handleDelete(selectedTask.id)}
                            >
                                Delete Task
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setSelectedTask(null)}
                            >
                                Close
                            </Button>
                        </>
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
                                        <Button variant="secondary" size="sm">
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
        </div>
    )
}
