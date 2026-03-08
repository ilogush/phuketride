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
        
        // Reset fired tracking for empty values so they can be shown again if they return
        if (!success) {
            for (const key of firedRef.current) {
                if (key.startsWith('s:')) firedRef.current.delete(key)
            }
        }
        if (!error) {
            for (const key of firedRef.current) {
                if (key.startsWith('e:')) firedRef.current.delete(key)
            }
        }
        
        let changed = false

        if (success && !firedRef.current.has(`s:${success}`)) {
            firedRef.current.add(`s:${success}`)
            if (!globalFiredKeys.has(`s:${success}`)) {
                globalFiredKeys.add(`s:${success}`)
                toast.success(success)
                changed = true
            }
        }
        if (error && !firedRef.current.has(`e:${error}`)) {
            firedRef.current.add(`e:${error}`)
            if (!globalFiredKeys.has(`e:${error}`)) {
                globalFiredKeys.add(`e:${error}`)
                toast.error(error)
                changed = true
            }
        }

        if (changed) {
            const next = new URLSearchParams(searchParams)
            next.delete('success')
            next.delete('error')
            setSearchParams(next, { replace: true })
            
            // Clear global keys fast enough to allow next navigation but slow enough for deduplication
            setTimeout(() => {
                if (success) globalFiredKeys.delete(`s:${success}`)
                if (error) globalFiredKeys.delete(`e:${error}`)
            }, 100)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])
}
