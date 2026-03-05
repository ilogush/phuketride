import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useToast } from '~/lib/toast'

const globalFiredKeys = new Set<string>()

/**
 * Reads `?success=` and `?error=` from the URL, shows a toast once,
 * then strips the params so the toast never fires again.
 */
export function useUrlToast() {
    const [searchParams, setSearchParams] = useSearchParams()
    const toast = useToast()
    const firedRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const success = searchParams.get('success')
        const error = searchParams.get('error')
        let changed = false

        if (success && !firedRef.current.has(`s:${success}`) && !globalFiredKeys.has(`s:${success}`)) {
            firedRef.current.add(`s:${success}`)
            globalFiredKeys.add(`s:${success}`)
            toast.success(success)
            changed = true
        }
        if (error && !firedRef.current.has(`e:${error}`) && !globalFiredKeys.has(`e:${error}`)) {
            firedRef.current.add(`e:${error}`)
            globalFiredKeys.add(`e:${error}`)
            toast.error(error)
            changed = true
        }

        if (changed) {
            const next = new URLSearchParams(searchParams)
            next.delete('success')
            next.delete('error')
            setSearchParams(next, { replace: true })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])
}
