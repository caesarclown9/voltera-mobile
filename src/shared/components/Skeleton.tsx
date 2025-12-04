/**
 * Skeleton компонент для loading состояний
 * Анимированный placeholder пока данные загружаются
 */

import { motion } from "framer-motion";

interface SkeletonProps {
  /** Ширина (по умолчанию 100%) */
  width?: string | number;
  /** Высота */
  height?: string | number;
  /** Форма: прямоугольник, круг или текст */
  variant?: "rectangular" | "circular" | "text";
  /** Дополнительные классы */
  className?: string;
  /** Количество строк (только для variant="text") */
  lines?: number;
}

export function Skeleton({
  width,
  height,
  variant = "rectangular",
  className = "",
  lines = 1,
}: SkeletonProps) {
  const baseClasses = "bg-gray-200 overflow-hidden";

  const shimmerAnimation = {
    initial: { x: "-100%" },
    animate: { x: "100%" },
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear",
    },
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} rounded h-4 relative`}
            style={{
              width: i === lines - 1 ? "60%" : "100%",
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              {...shimmerAnimation}
            />
          </div>
        ))}
      </div>
    );
  }

  const shapeClasses = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === "circular" ? height : "100%"),
    height: height ?? (variant === "text" ? "1rem" : "auto"),
  };

  return (
    <div
      className={`${baseClasses} ${shapeClasses[variant]} ${className} relative`}
      style={style}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        {...shimmerAnimation}
      />
    </div>
  );
}

/**
 * Skeleton для карточки станции
 */
export function StationCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex gap-4">
        {/* Иконка */}
        <Skeleton variant="circular" width={48} height={48} />

        <div className="flex-1">
          {/* Название */}
          <Skeleton variant="text" width="70%" height={20} className="mb-2" />

          {/* Адрес */}
          <Skeleton variant="text" width="90%" height={16} className="mb-3" />

          {/* Статус и коннекторы */}
          <div className="flex gap-2">
            <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
            <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton для списка станций
 */
export function StationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton для профиля
 */
export function ProfileSkeleton() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1">
          <Skeleton variant="text" width="50%" height={24} className="mb-2" />
          <Skeleton variant="text" width="70%" height={16} />
        </div>
      </div>

      {/* Balance card */}
      <Skeleton variant="rectangular" height={100} className="rounded-xl mb-6" />

      {/* Menu items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width="60%" height={18} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton для истории зарядок
 */
export function HistoryItemSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <Skeleton variant="text" width="60%" height={18} />
        <Skeleton variant="text" width={60} height={18} />
      </div>
      <Skeleton variant="text" width="80%" height={14} className="mb-2" />
      <div className="flex gap-4">
        <Skeleton variant="text" width={80} height={14} />
        <Skeleton variant="text" width={80} height={14} />
      </div>
    </div>
  );
}

/**
 * Skeleton для списка истории
 */
export function HistoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <HistoryItemSkeleton key={i} />
      ))}
    </div>
  );
}
