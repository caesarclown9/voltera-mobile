/**
 * Onboarding экран для новых пользователей
 * Показывается один раз при первом запуске приложения
 */

import { useState, useCallback, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, QrCode, Wallet, Zap, ChevronRight } from "lucide-react";

interface OnboardingSlide {
  id: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  gradient: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: MapPin,
    title: "Найдите станцию",
    description: "Откройте карту и найдите ближайшую зарядную станцию Voltera",
    gradient: "from-primary-400 to-primary-600",
  },
  {
    id: 2,
    icon: QrCode,
    title: "Сканируйте QR-код",
    description: "Отсканируйте QR-код на станции для быстрого подключения",
    gradient: "from-accent-400 to-accent-600",
  },
  {
    id: 3,
    icon: Wallet,
    title: "Пополняйте баланс",
    description: "Удобное пополнение через O!Деньги или банковскую карту",
    gradient: "from-success-400 to-success-600",
  },
  {
    id: 4,
    icon: Zap,
    title: "Начните зарядку!",
    description: "Всё готово для комфортной зарядки вашего электромобиля",
    gradient: "from-primary-500 to-accent-500",
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const isLastSlide = currentSlide === slides.length - 1;

  const nextSlide = useCallback(() => {
    if (isLastSlide) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [isLastSlide, onComplete]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const slide = slides[currentSlide];

  // Early return if slide is undefined (shouldn't happen with valid currentSlide)
  if (!slide) {
    return null;
  }

  const IconComponent = slide.icon;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header with skip button */}
      <div className="flex justify-end p-4 pt-safe">
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          Пропустить
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center"
          >
            {/* Icon with gradient background */}
            <motion.div
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-8 shadow-lg`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <IconComponent size={56} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-2xl font-bold text-gray-900 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {slide.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              className="text-gray-500 text-lg max-w-xs"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {slide.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-8">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "bg-primary-500 w-8"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            aria-label={`Слайд ${index + 1}`}
          />
        ))}
      </div>

      {/* Next/Start button */}
      <div className="px-6 pb-8 pb-safe">
        <motion.button
          onClick={nextSlide}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
            isLastSlide
              ? "bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg shadow-primary-500/30"
              : "bg-primary-500 hover:bg-primary-600"
          }`}
        >
          {isLastSlide ? (
            "Начать"
          ) : (
            <>
              Далее
              <ChevronRight size={20} />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
