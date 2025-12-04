/**
 * AnimatedList - компонент для анимированного появления элементов списка
 * Использует framer-motion для fade-in + slide-up эффекта
 */

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  /** Задержка между появлением элементов (мс) */
  staggerDelay?: number;
  /** Начальный сдвиг по Y (px) */
  initialY?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = "",
  staggerDelay = 0.08,
  initialY = 20,
}: AnimatedListProps<T>) {
  const customContainerVariants: Variants = {
    ...containerVariants,
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const customItemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: initialY,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={customContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => (
        <motion.div key={keyExtractor(item, index)} variants={customItemVariants}>
          {renderItem(item, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * AnimatedListItem - отдельный анимированный элемент для использования в циклах
 */
interface AnimatedListItemProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function AnimatedListItem({ children, index, className = "" }: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: index * 0.08,
      }}
    >
      {children}
    </motion.div>
  );
}
