import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useButtonInteraction } from "~/lib/useButtonInteraction";

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
  const { handleClick, isDisabled, isLoading, isSubmitClicked } = useButtonInteraction({
    disabled,
    loading,
    onClick,
    type,
  });
  const isIconButton = /\bw-\d+\b/.test(className) && /\bh-\d+\b/.test(className);
  const sizeClass = isIconButton ? "" : "rounded-xl px-5  text-base";

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${type === "submit" && isSubmitClicked ? "pointer-events-none" : ""} ${className}`}
      {...rest}
    >
      {isLoading ? (
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
