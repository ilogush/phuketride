import { useCallback } from 'react';
import { useToast } from '~/lib/toast';

/**
 * Hook for validating Latin characters in input fields
 * Returns a handler function that can be used with onChange event
 */
export function useLatinValidation() {
    const toast = useToast();

    const validateLatinInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
            const value = e.target.value;
            const latinRegex = /^[a-zA-Z0-9\s\-'.,()&/]*$/;
            
            if (value && !latinRegex.test(value)) {
                toast.warning(`${fieldName}: Only Latin characters allowed`);
                e.target.value = value.replace(/[^a-zA-Z0-9\s\-'.,()&/]/g, '');
            }
        },
        [toast]
    );

    return { validateLatinInput };
}
