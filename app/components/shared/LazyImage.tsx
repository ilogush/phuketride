import { useState, useEffect, useRef } from "react";
import { generateSrcSet, RESPONSIVE_CONFIGS } from "~/lib/responsive-image";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  responsive?: keyof typeof RESPONSIVE_CONFIGS;
  loading?: "lazy" | "eager";
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

/**
 * Lazy-loaded image component with responsive srcset support
 * Automatically loads images when they enter viewport
 */
export function LazyImage({
  src,
  alt,
  className = "",
  responsive,
  loading = "lazy",
  onLoad,
  onError,
  fallbackSrc = "/images/placeholder.svg",
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate responsive attributes if config provided
  const responsiveAttrs = responsive
    ? {
        srcSet: generateSrcSet(src, RESPONSIVE_CONFIGS[responsive].srcset),
        sizes: RESPONSIVE_CONFIGS[responsive].sizes,
      }
    : {};

  const displaySrc = hasError ? fallbackSrc : src;

  return (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      {...responsiveAttrs}
    />
  );
}

/**
 * Background image component with lazy loading
 */
export function LazyBackgroundImage({
  src,
  className = "",
  children,
}: {
  src: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            const img = new Image();
            img.src = src;
            img.onload = () => setIsLoaded(true);
          }
        });
      },
      { rootMargin: "50px" }
    );

    observer.observe(divRef.current);

    return () => observer.disconnect();
  }, [src, isLoaded]);

  return (
    <div
      ref={divRef}
      className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
      style={isLoaded ? { backgroundImage: `url(${src})` } : undefined}
    >
      {children}
    </div>
  );
}
