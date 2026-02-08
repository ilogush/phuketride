interface Task {
    id: string
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed'
    priority?: 'high' | 'medium' | 'low'
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
    if (!tasks || tasks.length === 0) {
        return null
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
                                ID
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.map((task) => (
                            <tr key={task.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="pl-4 py-2 text-sm text-gray-900 whitespace-nowrap align-middle">
                                    <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                                        {task.id.padStart(4, '0')}
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
