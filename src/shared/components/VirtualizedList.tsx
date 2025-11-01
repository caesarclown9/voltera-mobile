import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

/**
 * Виртуализированный список для эффективного рендера больших массивов данных
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  containerClassName,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const hasReachedEnd = useRef(false);

  // Вычисляем высоту элемента
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // Вычисляем общую высоту списка
  const totalHeight = items.reduce((acc, _, index) => {
    return acc + getItemHeight(index);
  }, 0);

  // Вычисляем видимый диапазон элементов
  const getVisibleRange = useCallback(() => {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Находим начальный индекс
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Находим конечный индекс
    accumulatedHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > containerHeight + scrollTop) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }

    return { startIndex, endIndex };
  }, [items.length, scrollTop, containerHeight, overscan, getItemHeight]);

  const { startIndex, endIndex } = getVisibleRange();

  // Вычисляем offset для позиционирования видимых элементов
  const getOffsetForIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [getItemHeight]
  );

  // Обработчик скролла с дебаунсом
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Проверяем, достигли ли конца списка
    if (onEndReached) {
      const scrollPercentage =
        (target.scrollTop + target.clientHeight) / target.scrollHeight;

      if (scrollPercentage >= endReachedThreshold && !hasReachedEnd.current) {
        hasReachedEnd.current = true;
        onEndReached();

        // Сбрасываем флаг через некоторое время
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          hasReachedEnd.current = false;
        }, 500);
      }
    }
  }, [onEndReached, endReachedThreshold]);

  // Обновляем высоту контейнера при изменении размера
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateContainerHeight();

    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Рендерим только видимые элементы
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    if (item) {
      visibleItems.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: getOffsetForIndex(i),
            left: 0,
            right: 0,
            height: getItemHeight(i),
          }}
          className={className}
        >
          {renderItem(item, i)}
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-auto ${containerClassName || ''}`}
      style={{ height: '100%' }}
    >
      {/* Spacer для правильного размера скролла */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * Hook для использования виртуализации с динамической загрузкой
 */
export function useVirtualizedData<T>(
  initialItems: T[],
  loadMore: () => Promise<T[]>
) {
  const [items, setItems] = useState(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const handleEndReached = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const newItems = await loadMore();

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, loadMore]);

  return {
    items,
    isLoading,
    hasMore,
    handleEndReached,
    resetItems: () => {
      setItems(initialItems);
      setHasMore(true);
    }
  };
}

/**
 * Оптимизированный компонент для рендера элементов списка
 */
export const VirtualizedItem = React.memo(
  ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
  }
);