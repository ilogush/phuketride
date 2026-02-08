import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '~/lib/toast'
import Modal from '~/components/dashboard/Modal'
import Button from '~/components/dashboard/Button'
import { BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/outline'

interface RoleSwitcherProps {
    currentRole: 'user' | 'partner'
    userId: string
    onRoleChange?: (newRole: 'user' | 'partner') => void
}

export default function RoleSwitcher({ currentRole, userId, onRoleChange }: RoleSwitcherProps) {
    const navigate = useNavigate()
    const toast = useToast()
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [companyName, setCompanyName] = useState('')
    const [companyPhone, setCompanyPhone] = useState('')

    const handleBecomePartner = async () => {
        if (!companyName.trim()) {
            await toast.error('Company name is required')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/auth/register-partner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    companyName: companyName.trim(),
                    phone: companyPhone.trim() || '',
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to Create')
            }

            await toast.success('Welcome to company partnership! You can now manage your vehicles and bookings.')
            setShowModal(false)
            onRoleChange?.('partner')

            navigate(0)
        } catch (error: any) {
            console.error('Error becoming partner:', error)
            await toast.error(error.message || 'Failed to become company partner')
        } finally {
            setLoading(false)
        }
    }

    const handleBecomeUser = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: 'user' }),
            })

            if (!response.ok) {
                throw new Error('Failed to switch to user mode')
            }

            await toast.success('Switched back to user mode. You can still access your company from the dashboard.')
            onRoleChange?.('user')

            navigate(0)
        } catch (error: any) {
            console.error('Error becoming user:', error)
            await toast.error(error.message || 'Failed to switch to user mode')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Account Type</h3>
                <div className="flex items-center space-x-2">
                    {currentRole === 'user' ? (
                        <UserIcon className="h-5 w-5 text-blue-500" />
                    ) : (
                        <BuildingOfficeIcon className="h-5 w-5 text-green-500" />
                    )}
                    <span className={`px-2 py-1 rounded-xl text-xs font-medium ${currentRole === 'user'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {currentRole === 'user' ? 'User' : 'Company Partner'}
                    </span>
                </div>
            </div>

            {currentRole === 'user' ? (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        You're currently using the platform as a user. You can rent cars and manage your bookings.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4">
                        <div className="flex">
                            <BuildingOfficeIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-800">Want to rent out your cars?</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Switch to company partner mode to create your company and start managing vehicles.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowModal(true)}
                        variant="primary"
                        fullWidth
                        icon={<BuildingOfficeIcon className="h-4 w-4" />}
                    >
                        Become a Company Partner
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        You're currently managing your company. You can add vehicles, manage bookings, and view reports.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-3xl p-4">
                        <div className="flex">
                            <UserIcon className="h-5 w-5 text-green-400 mt-0.5" />
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-green-800">Company Partner Active</h4>
                                <p className="text-sm text-green-700 mt-1">
                                    You have full access to company management features. You can also switch back to user mode anytime.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleBecomeUser}
                        disabled={loading}
                        variant="secondary"
                        fullWidth
                        icon={<UserIcon className="h-4 w-4" />}
                        loading={loading}
                    >
                        Switch to User Mode
                    </Button>
                </div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create Your Company"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Set up your company to start renting out vehicles. You can always update these details later.
                    </p>

                    <div>
                        <label htmlFor="companyName" className="block text-xs text-gray-600 mb-1">
                            Company Name *
                        </label>
                        <input
                            id="companyName"
                            type="text"
                            required
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                            placeholder="Your Company Name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="companyPhone" className="block text-xs text-gray-600 mb-1">
                            Company Phone (Optional)
                        </label>
                        <input
                            id="companyPhone"
                            type="tel"
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                            placeholder="+6699123456"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> After creating your company, you'll have access to vehicle management,
                            booking oversight, and financial reports.
                        </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="button"
                            onClick={() => setShowModal(false)}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBecomePartner}
                            disabled={loading || !companyName.trim()}
                            variant="primary"
                            className="flex-1"
                            loading={loading}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
