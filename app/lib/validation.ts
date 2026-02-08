export const validateLatinOnly = (value: string, fieldName: string): string | null => {
    if (!value.trim()) {
        return `${fieldName} is required`
    }
    if (!/^[a-zA-Z0-9\s\-\.@]+$/.test(value)) {
        return `${fieldName} must contain only Latin letters, numbers and allowed characters`
    }
    return null
}

export const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) {
        return 'Phone is required'
    }
    if (!/^[\d\s\-\(\)\+]+$/.test(phone)) {
        return 'Phone must contain only digits and allowed characters (+, -, parentheses)'
    }
    const digitCount = phone.replace(/\D/g, '').length
    if (digitCount < 9) {
        return 'Phone must contain at least 9 digits'
    }
    return null
}

export const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
        return 'Email is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return 'Invalid email format'
    }
    return null
}

export const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
        return 'Password must contain at least 6 characters'
    }

    if (/^(\d)\1+$/.test(password)) {
        return 'Password cannot consist of only repeating digits (e.g., 111111)'
    }

    if (/^123456|234567|345678|456789|567890|654321|543210|432109|321098|210987$/.test(password)) {
        return 'Password cannot be a sequence of digits (e.g., 123456)'
    }

    const commonPasswords = ['password', '123456', '12345678', 'qwerty', 'abc123', 'password123']
    if (commonPasswords.includes(password.toLowerCase())) {
        return 'This password is too simple. Use a more complex password'
    }

    return null
}

export const validateRequired = (value: string, fieldName: string): string | null => {
    if (!value.trim()) {
        return `${fieldName} is required`
    }
    return null
}

export const validateNumber = (value: string | number, fieldName: string, min?: number, max?: number): string | null => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) {
        return `${fieldName} must be a number`
    }
    if (min !== undefined && num < min) {
        return `${fieldName} must be at least ${min}`
    }
    if (max !== undefined && num > max) {
        return `${fieldName} must be at most ${max}`
    }
    return null
}

export const LATIN_ONLY_REGEX = /^[a-zA-Z0-9\s\-\._]+$/
export const LATIN_ONLY_MESSAGE = 'Must contain only Latin letters, numbers, spaces, hyphens, dots, and underscores'
export const NON_LATIN_REGEX = /[^\x00-\x7F\u00C0-\u024F]/

export function hasNonLatinChars(value: string): boolean {
    if (!value) return false
    return NON_LATIN_REGEX.test(value)
}

export function getNonLatinWarning(value: string): string | null {
    if (hasNonLatinChars(value)) {
        return 'Please use English (Latin) characters only'
    }
    return null
}

export const ENGLISH_ONLY_TOAST = 'Please use English characters only'
