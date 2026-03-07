import { type InputHTMLAttributes } from "react";

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;
}

/**
 * Input component with validation feedback
 * 
 * @example
 * <ValidatedInput
 *   label="Email"
 *   name="email"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   error={errors.email?.[0]}
 *   touched={touched.email}
 * />
 */
export function ValidatedInput({
  label,
  error,
  touched,
  showError = true,
  className = "",
  ...props
}: ValidatedInputProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        {...props}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-green-500
          transition-colors
          ${hasError ? "border-red-500 bg-red-50" : "border-gray-300"}
          ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${className}
        `}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${props.name}-error` : undefined}
      />
      
      {showError && hasError && (
        <p
          id={`${props.name}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

interface ValidatedTextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;
  rows?: number;
}

/**
 * Textarea component with validation feedback
 */
export function ValidatedTextarea({
  label,
  error,
  touched,
  showError = true,
  className = "",
  rows = 4,
  ...props
}: ValidatedTextareaProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        {...props}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-green-500
          transition-colors resize-y
          ${hasError ? "border-red-500 bg-red-50" : "border-gray-300"}
          ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${className}
        `}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${props.name}-error` : undefined}
      />
      
      {showError && hasError && (
        <p
          id={`${props.name}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

interface ValidatedSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;
  children: React.ReactNode;
}

/**
 * Select component with validation feedback
 */
export function ValidatedSelect({
  label,
  error,
  touched,
  showError = true,
  className = "",
  children,
  ...props
}: ValidatedSelectProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        {...props}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-green-500
          transition-colors
          ${hasError ? "border-red-500 bg-red-50" : "border-gray-300"}
          ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${className}
        `}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${props.name}-error` : undefined}
      >
        {children}
      </select>
      
      {showError && hasError && (
        <p
          id={`${props.name}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
