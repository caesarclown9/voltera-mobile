import { ChevronLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AboutPage() {
  const navigate = useNavigate();
  const appVersion = "1.0.1";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">О приложении</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Версия приложения</p>
          <p className="text-lg font-semibold">Voltera {appVersion}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <button
            onClick={() => window.open("/legal/privacy.html", "_blank")}
            className="w-full flex items-center justify-between px-2 py-3 rounded-lg hover:bg-gray-50"
          >
            <span className="font-medium">Политика конфиденциальности</span>
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => window.open("/legal/terms.html", "_blank")}
            className="w-full flex items-center justify-between px-2 py-3 rounded-lg hover:bg-gray-50"
          >
            <span className="font-medium">Условия использования</span>
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-600">Поддержка</p>
          <a
            href="mailto:support@voltera.kg"
            className="text-cyan-600 font-medium"
          >
            support@voltera.kg
          </a>
        </div>
      </div>
    </div>
  );
}
