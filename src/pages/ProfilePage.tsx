import {
  ChevronLeft,
  LogOut,
  Phone,
  Mail,
  Clock,
  DollarSign,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStatus, useLogout } from "../features/auth/hooks/useAuth";
import { useBalance } from "../features/balance/hooks/useBalance";
import { useEffect, useState } from "react";
import { evpowerApi } from "@/services/evpowerApi";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance();
  const [deleteRequested, setDeleteRequested] = useState(false);
  // Realtime подписка на баланс
  useEffect(() => {
    const sub = evpowerApi.subscribeToBalance((newBalance: number) => {
      // Ничего не делаем здесь напрямую — useBalance сам рефрешнётся через invalidate в хуке QR topup
      // Если потребуется — можно добавить локальный стейт или invalidateQueries
    });
    return () => {
      // sub может быть промисом; безопасно игнорируем, если null
      Promise.resolve(sub).then((s) => {
        try {
          (s as any)?.unsubscribe?.();
        } catch {}
      });
    };
  }, []);
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    console.log("[ProfilePage] Logout button clicked");
    try {
      await logoutMutation.mutateAsync();
      console.log("[ProfilePage] Logout mutation completed successfully");
    } catch (error) {
      console.error("[ProfilePage] Logout mutation failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Удалить аккаунт и данные? Это действие необратимо.")) return;
    try {
      await evpowerApi.requestAccountDeletion();
      alert(
        "Запрос на удаление отправлен. Мы обработаем его в ближайшее время.",
      );
      setDeleteRequested(true);
      await handleLogout();
    } catch (e) {
      alert("Не удалось запросить удаление. Попробуйте позже.");
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Ваш профиль</h1>
          <div className="w-10" /> {/* Пустое место для симметрии */}
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white mt-2 p-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">👤</span>
          </div>
          {user && (
            <>
              <p className="text-xl font-semibold mb-2">
                {user.name || "Пользователь"}
              </p>
              {user.email && (
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">Баланс</p>
                <p className="text-2xl font-bold text-green-600">
                  {isBalanceLoading ? "…" : (balanceData?.balance ?? 0)}{" "}
                  {balanceData?.currency || "сом"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        <button
          onClick={() => navigate("/history" + (!user ? "?auth=required" : ""))}
          className="w-full bg-cyan-500 text-white py-4 rounded-xl font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          История зарядок
        </button>

        <button
          onClick={() =>
            navigate("/payments" + (!user ? "?auth=required" : ""))
          }
          className="w-full bg-cyan-500 text-white py-4 rounded-xl font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          История платежей
        </button>

        <button
          onClick={() => navigate("/about")}
          className="w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />О приложении
        </button>

        {/* Logout/Login Button */}
        {user ? (
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {logoutMutation.isPending ? "Выход..." : "Выйти из аккаунта"}
          </button>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            Войти в аккаунт
          </button>
        )}
      </div>

      {/* Compact: только кнопки без инфо-блоков */}
      <div className="p-4 space-y-3">
        <button
          onClick={() => window.open("tel:+996555123456", "_self")}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Телефон поддержки
        </button>
        {user && (
          <button
            onClick={handleDeleteAccount}
            disabled={deleteRequested}
            className={`w-full py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${deleteRequested ? "bg-red-300 text-white cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"}`}
          >
            <Trash2 className="w-5 h-5" />
            {deleteRequested ? "Запрос отправлен" : "Удалить аккаунт и данные"}
          </button>
        )}
      </div>
    </div>
  );
};
