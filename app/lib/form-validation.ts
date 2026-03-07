/**
 * Client-side form validation utilities
 * Provides instant feedback before server submission
 */

export type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

export type FieldValidation = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: ValidationRule[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validate a single field value
 */
export function validateField(
  value: string,
  rules: FieldValidation
): ValidationResult {
  const errors: string[] = [];

  // Required check
  if (rules.required && !value.trim()) {
    errors.push("This field is required");
    return { valid: false, errors };
  }

  // Skip other validations if empty and not required
  if (!value.trim() && !rules.required) {
    return { valid: true, errors: [] };
  }

  // Min length
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimum ${rules.minLength} characters required`);
  }

  // Max length
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Maximum ${rules.maxLength} characters allowed`);
  }

  // Pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push("Invalid format");
  }

  // Custom rules
  if (rules.custom) {
    for (const rule of rules.custom) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Common validation rules
 */
export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Invalid email address",
  },

  phone: {
    pattern: /^\+?[\d\s-()]+$/,
    message: "Invalid phone number",
  },

  latinOnly: {
    pattern: /^[a-zA-Z\s-]+$/,
    message: "Only Latin characters allowed",
  },

  numeric: {
    pattern: /^\d+$/,
    message: "Only numbers allowed",
  },

  decimal: {
    pattern: /^\d+(\.\d+)?$/,
    message: "Invalid number format",
  },

  url: {
    pattern: /^https?:\/\/.+/,
    message: "Invalid URL",
  },

  passport: {
    pattern: /^[A-Z0-9]+$/,
    message: "Invalid passport format",
  },

  licensePlate: {
    pattern: /^[A-Z0-9\s-]+$/i,
    message: "Invalid license plate format",
  },
};

/**
 * Validate entire form
 */
export function validateForm(
  formData: Record<string, string>,
  rules: Record<string, FieldValidation>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = formData[field] || "";
    results[field] = validateField(value, fieldRules);
  }

  return results;
}

/**
 * Check if form is valid
 */
export function isFormValid(
  results: Record<string, ValidationResult>
): boolean {
  return Object.values(results).every((result) => result.valid);
}

/**
 * Get all form errors
 */
export function getFormErrors(
  results: Record<string, ValidationResult>
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [field, result] of Object.entries(results)) {
    if (!result.valid) {
      errors[field] = result.errors;
    }
  }

  return errors;
}

/**
 * Debounce validation for real-time feedback
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
