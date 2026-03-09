import { useNavigate, Link } from 'react-router'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Button from '~/components/shared/ui/Button'

interface BackButtonProps {
    href?: string
    to?: string
    useHistory?: boolean
}

export function BackButton({ href, to, useHistory = true }: BackButtonProps) {
    const navigate = useNavigate()

    if (useHistory) {
        return (
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
            >
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
        )
    }

    const destination = to || href || '/'
    return (
        <Link
            to={destination}
            className="inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        >
            <ArrowLeftIcon className="w-5 h-5" />
        </Link>
    )
}

export default BackButton;
