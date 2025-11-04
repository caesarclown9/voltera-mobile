import { motion, AnimatePresence } from "framer-motion";
import { XCircle, X } from "lucide-react";
import { useEffect } from "react";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

/**
 * Центрированный модальный компонент для отображения ошибок
 *
 * @param isOpen - Состояние видимости модального окна
 * @param onClose - Callback для закрытия модального окна
 * @param title - Заголовок ошибки (по умолчанию "Ошибка")
 * @param message - Текст сообщения об ошибке
 *
 * @example
 * const [showError, setShowError] = useState(false);
 * <ErrorModal
 *   isOpen={showError}
 *   onClose={() => setShowError(false)}
 *   message="Не удалось выполнить операцию"
 * />
 */
export function ErrorModal({
  isOpen,
  onClose,
  title = "Ошибка",
  message,
}: ErrorModalProps) {
  // Блокируем прокрутку body когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                duration: 0.3,
                bounce: 0.3,
              }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Message */}
              <div className="px-6 pb-6">
                <p className="text-gray-700 leading-relaxed">{message}</p>
              </div>

              {/* Action button */}
              <div className="border-t border-gray-100 px-6 py-4">
                <button
                  onClick={onClose}
                  className="w-full bg-error-600 hover:bg-error-700 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all active:scale-95"
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
