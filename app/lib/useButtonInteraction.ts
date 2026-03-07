import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

interface UseButtonInteractionOptions {
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event?: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

export function useButtonInteraction({
  disabled = false,
  loading = false,
  type = "button",
  onClick,
}: UseButtonInteractionOptions) {
  const navigation = useNavigation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitClicked, setIsSubmitClicked] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setIsSubmitClicked(false);
    }
  }, [navigation.state]);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (isProcessing || disabled || loading) {
      event.preventDefault();
      return;
    }

    if (type === "submit" && isSubmitClicked) {
      event.preventDefault();
      return;
    }

    if (type === "submit") {
      setIsSubmitClicked(true);
      onClick?.(event);
      if (event.defaultPrevented) {
        setIsSubmitClicked(false);
      }
      return;
    }

    if (!onClick) {
      return;
    }

    setIsProcessing(true);
    try {
      await onClick(event);
    } finally {
      setIsProcessing(false);
    }
  };

  const isNavigating = navigation.state === "submitting" || navigation.state === "loading";
  const isSubmitting = type === "submit" && (isSubmitClicked || isNavigating);

  return {
    handleClick,
    isDisabled: disabled || loading || isProcessing || (type === "submit" && isNavigating),
    isLoading: loading || isProcessing || isSubmitting,
    isSubmitClicked,
  };
}
