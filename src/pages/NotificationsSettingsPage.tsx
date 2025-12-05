import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Zap, CreditCard, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { storage } from "@/shared/utils/storage";

interface NotificationSettings {
  chargingUpdates: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
  systemAlerts: boolean;
}

const NOTIFICATIONS_KEY = "notification_settings";

const defaultSettings: NotificationSettings = {
  chargingUpdates: true,
  paymentAlerts: true,
  promotions: false,
  systemAlerts: true,
};

export const NotificationsSettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = storage.get<NotificationSettings>(NOTIFICATIONS_KEY);
    return stored || defaultSettings;
  });

  useEffect(() => {
    storage.set(NOTIFICATIONS_KEY, settings);
  }, [settings]);

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const ToggleSwitch = ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

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
            Уведомления
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          {/* Зарядка */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Зарядка
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Статус и завершение зарядки
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.chargingUpdates}
              onToggle={() => toggleSetting("chargingUpdates")}
            />
          </div>

          {/* Платежи */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Платежи
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Пополнения и списания
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.paymentAlerts}
              onToggle={() => toggleSetting("paymentAlerts")}
            />
          </div>

          {/* Акции */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Акции и новости
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Скидки и специальные предложения
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.promotions}
              onToggle={() => toggleSetting("promotions")}
            />
          </div>

          {/* Системные */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Системные
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Обновления и важные сообщения
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.systemAlerts}
              onToggle={() => toggleSetting("systemAlerts")}
            />
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
          Push-уведомления помогут вам отслеживать статус зарядки и быть в курсе
          важных событий
        </p>
      </main>
    </div>
  );
};

export default NotificationsSettingsPage;
