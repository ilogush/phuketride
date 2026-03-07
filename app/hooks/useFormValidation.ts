import { useState, useCallback } from "react";
import {
  validateField,
  validateForm,
  isFormValid,
  getFormErrors,
  debounce,
  type FieldValidation,
  type ValidationResult,
} from "~/lib/form-validation";

export type FormValidationConfig = Record<string, FieldValidation>;

export type FormValidationState = {
  values: Record<string, string>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
};

export type FormValidationActions = {
  setValue: (field: string, value: string) => void;
  setTouched: (field: string) => void;
  validateField: (field: string) => void;
  validateAll: () => boolean;
  reset: () => void;
  setSubmitting: (submitting: boolean) => void;
};

/**
 * Hook for form validation with instant feedback
 * 
 * @example
 * const { state, actions } = useFormValidation({
 *   email: { required: true, pattern: VALIDATION_RULES.email.pattern },
 *   name: { required: true, minLength: 2 },
 * });
 * 
 * <input
 *   value={state.values.email || ""}
 *   onChange={(e) => actions.setValue("email", e.target.value)}
 *   onBlur={() => actions.setTouched("email")}
 * />
 * {state.touched.email && state.errors.email && (
 *   <div>{state.errors.email[0]}</div>
 * )}
 */
export function useFormValidation(
  config: FormValidationConfig,
  initialValues: Record<string, string> = {}
): {
  state: FormValidationState;
  actions: FormValidationActions;
} {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced validation for real-time feedback
  const debouncedValidate = useCallback(
    debounce((field: string, value: string) => {
      const rules = config[field];
      if (!rules) return;

      const result = validateField(value, rules);
      setErrors((prev) => ({
        ...prev,
        [field]: result.valid ? [] : result.errors,
      }));
    }, 300),
    [config]
  );

  const setValue = useCallback(
    (field: string, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      // Validate on change if field was touched
      if (touched[field]) {
        debouncedValidate(field, value);
      }
    },
    [touched, debouncedValidate]
  );

  const setTouchedField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateSingleField = useCallback(
    (field: string) => {
      const rules = config[field];
      if (!rules) return;

      const value = values[field] || "";
      const result = validateField(value, rules);

      setErrors((prev) => ({
        ...prev,
        [field]: result.valid ? [] : result.errors,
      }));
    },
    [config, values]
  );

  const validateAll = useCallback((): boolean => {
    const results = validateForm(values, config);
    const formErrors = getFormErrors(results);
    const valid = isFormValid(results);

    setErrors(formErrors);

    // Mark all fields as touched
    const allTouched = Object.keys(config).reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setTouched(allTouched);

    return valid;
  }, [values, config]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).every(
    (field) => !errors[field] || errors[field].length === 0
  );

  return {
    state: {
      values,
      errors,
      touched,
      isValid,
      isSubmitting,
    },
    actions: {
      setValue,
      setTouched: setTouchedField,
      validateField: validateSingleField,
      validateAll,
      reset,
      setSubmitting: setIsSubmitting,
    },
  };
}
