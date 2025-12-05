import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Bell,
  Info,
  Shield,
  FileText,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/features/theme";
import { LanguageSelector } from "@/i18n/LanguageSelector";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
            {t("settings.title")}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Тема оформления */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("settings.appearance")}
            </h2>
          </div>
          <div className="p-4">
            <ThemeToggle showLabels={true} />
          </div>
        </div>

        {/* Язык */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("settings.languageLabel")}
            </h2>
          </div>
          <div className="p-4">
            <LanguageSelector showLabel={false} />
          </div>
        </div>

        {/* Уведомления */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => navigate("/settings/notifications")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {t("settings.notifications")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Информация */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t("settings.information")}
            </h2>
          </div>

          <button
            onClick={() => navigate("/about")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {t("settings.aboutApp")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => window.open("https://voltera.kg/privacy", "_blank")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {t("settings.privacyPolicy")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => window.open("https://voltera.kg/terms", "_blank")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {t("settings.termsOfUse")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
