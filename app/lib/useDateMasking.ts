import { useCallback } from 'react';

/**
 * Hook for date input masking and validation (DD/MM/YYYY)
 */
export function useDateMasking() {
    const maskDateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

        if (value.length > 8) {
            value = value.slice(0, 8);
        }

        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = value.slice(0, 2);
            if (value.length > 2) {
                formattedValue += '/' + value.slice(2, 4);
                if (value.length > 4) {
                    formattedValue += '/' + value.slice(4, 8);
                }
            }
        }

        e.target.value = formattedValue;
    }, []);

    const maskDateTimeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

        if (value.length > 12) {
            value = value.slice(0, 12);
        }

        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = value.slice(0, 2); // DD
            if (value.length > 2) {
                formattedValue += '/' + value.slice(2, 4); // MM
                if (value.length > 4) {
                    formattedValue += '/' + value.slice(4, 8); // YYYY
                    if (value.length > 8) {
                        formattedValue += ' ' + value.slice(8, 10); // HH
                        if (value.length > 10) {
                            formattedValue += ':' + value.slice(10, 12); // mm
                        }
                    }
                }
            }
        }

        e.target.value = formattedValue;
    }, []);

    return { maskDateInput, maskDateTimeInput };
}
