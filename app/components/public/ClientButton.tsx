import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

interface ClientButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  children?: ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
}

export default function ClientButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  loading = false,
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

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {(loading || isProcessing) ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children && <span className="ml-2 opacity-70">{children}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
