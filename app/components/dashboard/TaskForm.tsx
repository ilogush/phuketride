import { useState, useEffect } from 'react'
import Button from '~/components/dashboard/Button'
import Modal from '~/components/dashboard/Modal'
import FormField from '~/components/dashboard/FormField'

interface User {
    id: string
    name: string
    surname: string
    email: string
}

interface Task {
    id: number
    title: string
    description: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    due_date: string | null
    assigned_to: string | null
    created_by: string
    assigned_to_user?: User
    created_by_user?: User
}

interface TaskFormProps {
    task?: Task | null
    users: User[]
    onSubmit: (data: any) => void
    onCancel: () => void
}

export function TaskForm({ task, users, onSubmit, onCancel }: TaskFormProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        due_date: '',
        assigned_to: [] as string[],
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                status: task.status,
                due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
                assigned_to: task.assigned_to ? [task.assigned_to] : [],
            })
        }
    }, [task])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
        setFormData(prev => ({ ...prev, assigned_to: selectedOptions }))
        if (errors.assigned_to) {
            setErrors(prev => ({ ...prev, assigned_to: '' }))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const newErrors: Record<string, string> = {}
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required'
        }
        if (formData.assigned_to.length === 0 && !task) {
            newErrors.assigned_to = 'At least one recipient is required'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        onSubmit({
            ...formData,
            description: formData.description || null,
            due_date: formData.due_date || null,
            assigned_to: task
                ? (formData.assigned_to[0] || null)
                : formData.assigned_to,
        })
    }

    return (
        <Modal
            title={task ? 'Edit Task' : 'Create Task'}
            onClose={onCancel}
            maxWidth="lg"
            actions={
                <Button
                    type="submit"
                    form="task-form"
                    variant="primary"
                >
                    {task ? 'Save' : 'Add'}
                </Button>
            }
        >
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Title" required error={errors.title}>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                            className={`block w-full rounded-3xl sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.title ? 'border-gray-600' : ''
                            }`}
                        placeholder="Enter task title"
                    />
                </FormField>

                <FormField label="Description" error={errors.description}>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className={`block w-full rounded-3xl sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.description ? 'border-gray-600' : ''
                            }`}
                        placeholder="Enter task description"
                    />
                </FormField>

                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                        <FormField label="Status" required error={errors.status}>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className={`block w-full rounded-3xl sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.status ? 'border-gray-600' : ''
                                    }`}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="col-span-2">
                        <FormField label="Due Date" error={errors.due_date}>
                            <input
                                type="datetime-local"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleChange}
                                className={`block w-full rounded-3xl sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.due_date ? 'border-gray-600' : ''
                                    }`}
                            />
                        </FormField>
                    </div>
                </div>

                <FormField
                    label={task ? "Assign To" : "Assign To (Select 1+ recipients)"}
                    required
                    error={errors.assigned_to}
                >
                    {task ? (
                        <select
                            name="assigned_to"
                            value={formData.assigned_to[0] || ''}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, assigned_to: e.target.value ? [e.target.value] : [] }))
                                if (errors.assigned_to) {
                                    setErrors(prev => ({ ...prev, assigned_to: '' }))
                                }
                            }}
                            className={`block w-full rounded-3xl sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.assigned_to ? 'border-gray-600' : ''
                                }`}
                        >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} {user.surname} ({user.email})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <select
                                name="assigned_to"
                                multiple
                                value={formData.assigned_to}
                                onChange={handleMultiSelectChange}
                                size={Math.min(users.length, 6)}
                                className={`block w-full rounded-lg sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors ${errors.assigned_to ? 'border-gray-600' : ''
                                    }`}
                            >
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} {user.surname} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Hold Ctrl (Cmd on Mac) to select multiple recipients. Selected: {formData.assigned_to.length}
                            </p>
                        </>
                    )}
                </FormField>
            </form>
        </Modal>
    )
}
