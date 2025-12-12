import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";

export const SupportPage = () => {
  const navigate = useNavigate();

  const contactMethods = [
    {
      icon: Phone,
      title: "Телефон",
      value: "+996 559 974 545",
      action: () => window.open("tel:+996559974545"),
      color: "primary",
    },
    {
      icon: Mail,
      title: "Email",
      value: "support@voltera.kg",
      action: () => window.open("mailto:support@voltera.kg"),
      color: "accent",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Поддержка
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Контакты */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Связаться с нами
            </h2>
          </div>

          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            const bgColor =
              method.color === "primary"
                ? "bg-primary-100 dark:bg-primary-900/30"
                : method.color === "success"
                  ? "bg-success-100 dark:bg-success-900/30"
                  : "bg-accent-100 dark:bg-accent-900/30";
            const iconColor =
              method.color === "primary"
                ? "text-primary-600 dark:text-primary-400"
                : method.color === "success"
                  ? "text-success-600 dark:text-success-400"
                  : "text-accent-600 dark:text-accent-400";

            return (
              <button
                key={index}
                onClick={method.action}
                className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  index < contactMethods.length - 1
                    ? "border-b border-gray-100 dark:border-gray-700"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {method.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {method.value}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* Время работы */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Время работы
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Ежедневно
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  09:00 - 21:00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Адрес */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Офис
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  г. Бишкек
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Кыргызская Республика
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Часто задаваемые вопросы
          </h3>

          <div className="space-y-3">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                Как начать зарядку?
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronLeft className="w-4 h-4 rotate-[-90deg]" />
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 pl-0">
                Выберите станцию на карте, убедитесь что у вас достаточно
                средств на балансе, подключите кабель и нажмите «Начать
                зарядку».
              </p>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                Как пополнить баланс?
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronLeft className="w-4 h-4 rotate-[-90deg]" />
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 pl-0">
                Перейдите в профиль и нажмите «Пополнить». Вы можете оплатить
                через O!Dengi, отсканировав QR-код.
              </p>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                Что делать если зарядка не работает?
                <span className="transform group-open:rotate-180 transition-transform">
                  <ChevronLeft className="w-4 h-4 rotate-[-90deg]" />
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 pl-0">
                Проверьте подключение кабеля, убедитесь что на балансе
                достаточно средств. Если проблема сохраняется - свяжитесь с
                нами.
              </p>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupportPage;
