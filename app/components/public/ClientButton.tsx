import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

type ClientButtonVariant = "primary" | "secondary" | "ghost";
type ClientButtonSize = "sm" | "md" | "lg";

interface ClientButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  children?: ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
  variant?: ClientButtonVariant;
  size?: ClientButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export default function ClientButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  loading = false,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  ...rest
}: ClientButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isProcessing || disabled || loading) {
      e.preventDefault();
      return;
    }

    if (!onClick) {
      return;
    }

    setIsProcessing(true);
    try {
      await onClick(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || loading || isProcessing;
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const variantClasses = {
    primary: "bg-green-600 text-white hover:bg-green-700 border border-transparent",
    secondary: "bg-white text-green-600 border border-green-600 hover:bg-green-50 hover:text-green-700",
    ghost: "bg-transparent text-gray-800 border border-transparent hover:bg-green-50",
  } satisfies Record<ClientButtonVariant, string>;
  const sizeClasses = {
    sm: "h-9 px-4 text-sm",
    md: "h-10 px-6 text-sm",
    lg: "h-12 px-6 text-base",
  } satisfies Record<ClientButtonSize, string>;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={[
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...rest}
    >
      {(loading || isProcessing) ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children && <span className="ml-2 opacity-70">{children}</span>}
        </>
      ) : (
        <>
          {leadingIcon ? <span className="flex-shrink-0">{leadingIcon}</span> : null}
          {children}
          {trailingIcon ? <span className="flex-shrink-0">{trailingIcon}</span> : null}
        </>
      )}
    </button>
  );
}
