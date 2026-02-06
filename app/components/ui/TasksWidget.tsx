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

export default function TasksWidget({ tasks }: TasksWidgetProps) {
    if (!tasks || tasks.length === 0) {
        return null
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-white">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">My Tasks</h2>
                <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                        {tasks.length}
                    </span>
                </div>
            </div>

            <div className="h-px bg-gray-100 mx-8"></div>

            {/* Tasks List */}
            <div className="p-4">
                <div className="space-y-6">
                    {tasks.map((task) => (
                        <div key={task.id} className="space-y-4 group">
                            <div className="space-y-1.5">
                                <p className="text-sm font-bold text-gray-900 tracking-tight">{task.title}</p>
                                <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                    {task.description}
                                </p>
                            </div>
                            <div className="flex items-center">
                                <span className="inline-flex items-center px-3 py-1 text-xs font-bold tracking-wide text-yellow-700 bg-yellow-50 rounded-lg border border-yellow-100 uppercase">
                                    {task.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Footer */}
            <div className="py-4 text-center bg-gray-50/30">
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors tracking-tight">
                    View all tasks
                </button>
            </div>
        </div>
    )
}
