import { ChevronLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function AboutPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const appVersion = "1.0.1";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("about.title")}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm text-center">
          <img
            src="/icons/voltera-logo-horizontal.svg"
            alt="Voltera"
            className="h-20 w-auto mx-auto mb-4 dark:invert dark:brightness-200"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("about.appVersion")}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Voltera {appVersion}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
          <button
            onClick={() => window.open("/legal/privacy.html", "_blank")}
            className="w-full flex items-center justify-between px-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              {t("about.privacyPolicy")}
            </span>
            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => window.open("/legal/terms.html", "_blank")}
            className="w-full flex items-center justify-between px-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              {t("about.termsOfUse")}
            </span>
            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("about.support")}
          </p>
          <a
            href="mailto:support@voltera.kg"
            className="text-primary-600 dark:text-primary-400 font-medium"
          >
            support@voltera.kg
          </a>
        </div>
      </div>
    </div>
  );
}
