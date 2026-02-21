import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

interface PublicButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  children?: ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
}

export default function Button({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  loading = false,
  ...rest
}: PublicButtonProps) {
  const navigation = useNavigation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitClicked, setIsSubmitClicked] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isProcessing || disabled || loading) {
      e.preventDefault();
      return;
    }

    if (type === "submit" && isSubmitClicked) {
      e.preventDefault();
      return;
    }

    if (type === "submit") {
      setIsSubmitClicked(true);
      onClick?.(e);
      if (e.defaultPrevented) {
        setIsSubmitClicked(false);
      }
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

  const isNavigating = navigation.state === "submitting" || navigation.state === "loading";
  const isSubmitting = type === "submit" && (isSubmitClicked || isNavigating);
  const isDisabled = disabled || loading || isProcessing || (type === "submit" && isNavigating);
  const isIconButton = /\bw-\d+\b/.test(className) && /\bh-\d+\b/.test(className);
  const sizeClass = isIconButton ? "" : "rounded-xl px-5 py-3 text-base";

  useEffect(() => {
    if (navigation.state === "idle") {
      setIsSubmitClicked(false);
    }
  }, [navigation.state]);

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${type === "submit" && isSubmitClicked ? "pointer-events-none" : ""} ${className}`}
      {...rest}
    >
      {(loading || isProcessing || isSubmitting) ? (
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
