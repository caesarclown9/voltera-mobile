import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { logger } from "../utils/logger";

interface LazyLoadProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  threshold?: number | number[];
  onVisible?: () => void;
  once?: boolean;
  className?: string;
  fallback?: ReactNode;
}

/**
 * Компонент для ленивой загрузки контента при попадании в viewport
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  placeholder = <div className="animate-pulse bg-gray-200 rounded-lg h-32" />,
  rootMargin = "100px",
  threshold = 0.1,
  onVisible,
  once = true,
  className,
  fallback,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Если уже был видимым и once = true, не создаем новый observer
    if (hasBeenVisible.current && once) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries || entries.length === 0) return;
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          hasBeenVisible.current = true;

          if (onVisible) {
            onVisible();
          }

          // Если once = true, отключаем наблюдение после первого показа
          if (once) {
            observer.disconnect();
          }
        } else if (!once && entry) {
          setIsVisible(false);
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, once, onVisible]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <ErrorBoundary onError={() => setHasError(true)}>
          {children}
        </ErrorBoundary>
      ) : (
        placeholder
      )}
    </div>
  );
};

/**
 * HOC для создания lazy компонента
 */
export function withLazyLoad<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<LazyLoadProps, "children">,
) {
  return (props: P) => (
    <LazyLoad {...options}>
      <Component {...props} />
    </LazyLoad>
  );
}

/**
 * Компонент для ленивой загрузки изображений
 */
interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E',
  className,
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [_hasError, setHasError] = useState(false);

  return (
    <LazyLoad
      placeholder={<img src={placeholder} alt={alt} className={className} />}
      onVisible={() => {
        // Начинаем загрузку реального изображения
        const img = new Image();
        img.src = src;

        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
          if (onLoad) onLoad();
        };

        img.onerror = () => {
          setHasError(true);
          if (onError) onError();
        };
      }}
    >
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoaded ? "fade-in" : ""}`}
        loading="lazy"
      />
    </LazyLoad>
  );
};

/**
 * Компонент для ленивой загрузки списков
 */
interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  batchSize?: number;
  className?: string;
  itemClassName?: string;
}

export function LazyList<T>({
  items,
  renderItem,
  batchSize = 10,
  className,
  itemClassName,
}: LazyListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loaderRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries || entries.length === 0) return;
        const entry = entries[0];
        if (entry && entry.isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <div key={index} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {visibleCount < items.length && (
        <div ref={loaderRef} className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}
    </div>
  );
}

// Простой Error Boundary для обработки ошибок в lazy компонентах
class ErrorBoundary extends React.Component<{
  children: ReactNode;
  onError?: () => void;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logger.error("LazyLoad error:", error);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
