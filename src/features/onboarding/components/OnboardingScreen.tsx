/**
 * Onboarding экран для новых пользователей
 * Показывается один раз при первом запуске приложения
 */

import { useState, useCallback, useMemo, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Wallet, Zap, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OnboardingSlide {
  id: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  titleKey: string;
  descriptionKey: string;
  gradient: string;
}

const slidesConfig: OnboardingSlide[] = [
  {
    id: 1,
    icon: MapPin,
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Desc",
    gradient: "from-primary-400 to-primary-600",
  },
  {
    id: 2,
    icon: Wallet,
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Desc",
    gradient: "from-success-400 to-success-600",
  },
  {
    id: 3,
    icon: Zap,
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Desc",
    gradient: "from-primary-500 to-accent-500",
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const slides = useMemo(
    () =>
      slidesConfig.map((slide) => ({
        ...slide,
        title: t(slide.titleKey),
        description: t(slide.descriptionKey),
      })),
    [t],
  );

  const isLastSlide = currentSlide === slides.length - 1;

  const nextSlide = useCallback(() => {
    if (isLastSlide) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [isLastSlide, onComplete]);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
    },
    [currentSlide],
  );

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
    <div className="fixed inset-0 bg-white z-50 flex flex-col safe-area-inset">
      {/* Header with skip button */}
      <div className="flex justify-end p-4 pt-12">
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          {t("onboarding.skip")}
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
      <div className="px-6 pb-6 mb-4">
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
            t("onboarding.start")
          ) : (
            <>
              {t("onboarding.next")}
              <ChevronRight size={20} />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
