import { Link } from 'react-router'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface BackButtonProps {
    href: string
}

export function BackButton({ href }: BackButtonProps) {
    return (
        <Link
            to={href}
            className="inline-flex items-center justify-center p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
        >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
    )
}
