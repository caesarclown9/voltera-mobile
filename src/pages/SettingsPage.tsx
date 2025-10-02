import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Globe, Info, Shield, FileText } from 'lucide-react';
import { useSettingsStore } from '../features/settings/stores/settingsStore';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, darkMode, language, setNotifications, setDarkMode } = useSettingsStore();

  const languageNames = {
    ru: 'Русский',
    en: 'English',
    ky: 'Кыргызча'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">Настройки</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y">
            {/* Push уведомления */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-gray-500" />
                <span>Push-уведомления</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Темная тема */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="h-5 w-5 text-gray-500" />
                <span>Темная тема</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Язык */}
            <button
              onClick={() => navigate('/settings/language')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <div>Язык приложения</div>
                  <div className="text-sm text-gray-500">{languageNames[language]}</div>
                </div>
              </div>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>

            {/* О приложении */}
            <button
              onClick={() => navigate('/settings/about')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-gray-500" />
                <span>О приложении</span>
              </div>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>

            {/* Политика конфиденциальности */}
            <button
              onClick={() => navigate('/settings/privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <span>Политика конфиденциальности</span>
              </div>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>

            {/* Условия использования */}
            <button
              onClick={() => navigate('/settings/terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <span>Условия использования</span>
              </div>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;