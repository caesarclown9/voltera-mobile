import {
  ChevronLeft,
  LogOut,
  Clock,
  CreditCard,
  Bell,
  Settings,
  HelpCircle,
  Info,
  Trash2,
  Palette,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStatus, useLogout } from "../features/auth/hooks/useAuth";
import { useBalance } from "../features/balance/hooks/useBalance";
import { useEffect, useState } from "react";
import { evpowerApi } from "@/services/evpowerApi";
import { logger } from "@/shared/utils/logger";
import {
  ProfileHeader,
  BalanceCard,
  ProfileSection,
  ProfileMenuItem,
} from "@/features/profile/components";
import { SimpleTopup } from "@/features/balance/components/SimpleTopup";
import { ThemeToggle } from "@/features/theme";
import { LanguageSelector } from "@/i18n/LanguageSelector";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance();
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [showTopup, setShowTopup] = useState(false);

  // Realtime подписка на баланс
  useEffect(() => {
    const sub = evpowerApi.subscribeToBalance(() => {
      // useBalance сам рефрешнётся через invalidate
    });
    return () => {
      Promise.resolve(sub)
        .then((s) => {
          try {
            const subscription = s as { unsubscribe?: () => void } | null;
            subscription?.unsubscribe?.();
          } catch {
            // Игнорируем ошибки при отписке
          }
        })
        .catch(() => {
          // Игнорируем ошибки промиса
        });
    };
  }, []);

  const logoutMutation = useLogout();

  const handleLogout = async () => {
    logger.debug("[ProfilePage] Logout button clicked");
    try {
      await logoutMutation.mutateAsync();
      logger.debug("[ProfilePage] Logout mutation completed successfully");
    } catch (error) {
      logger.error("[ProfilePage] Logout mutation failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Удалить аккаунт и данные? Это действие необратимо.")) return;
    try {
      await evpowerApi.requestAccountDeletion();
      alert(
        "Запрос на удаление отправлен. Мы обработаем его в ближайшее время."
      );
      setDeleteRequested(true);
      await handleLogout();
    } catch (e) {
      alert("Не удалось запросить удаление. Попробуйте позже.");
      logger.error("Failed to delete account:", e);
    }
  };

  // Неавторизованный пользователь
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center p-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Профиль</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Info className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Войдите в аккаунт
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
            Чтобы просматривать историю зарядок и управлять балансом
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="w-full max-w-xs bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
          >
            Войти
          </button>
        </div>

        {/* Тема и язык для неавторизованных */}
        <ProfileSection title="Настройки">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <ThemeToggle showLabels={false} compact />
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-lg">🌐</span>
            </div>
            <div className="flex-1">
              <LanguageSelector compact showLabel={false} />
            </div>
          </div>
        </ProfileSection>

        {/* Информация */}
        <ProfileSection title="Информация">
          <ProfileMenuItem
            icon={HelpCircle}
            label="Поддержка"
            onClick={() => navigate("/support")}
          />
          <ProfileMenuItem
            icon={Info}
            label="О приложении"
            onClick={() => navigate("/about")}
          />
        </ProfileSection>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Профиль</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800">
        <ProfileHeader
          name={user.name || user.email?.split("@")[0] || "Пользователь"}
          email={user.email ?? undefined}
        />
      </div>

      {/* Balance Card */}
      <div className="bg-white dark:bg-gray-800 pb-4">
        <BalanceCard
          balance={balanceData?.balance ?? 0}
          currency={balanceData?.currency || "сом"}
          isLoading={isBalanceLoading}
          onTopup={() => setShowTopup(true)}
        />
      </div>

      {/* История */}
      <ProfileSection title="История">
        <ProfileMenuItem
          icon={Clock}
          label="История зарядок"
          onClick={() => navigate("/history")}
        />
        <ProfileMenuItem
          icon={CreditCard}
          label="История платежей"
          onClick={() => navigate("/payments")}
        />
      </ProfileSection>

      {/* Настройки */}
      <ProfileSection title="Настройки">
        <ProfileMenuItem
          icon={Bell}
          label="Уведомления"
          onClick={() => navigate("/settings/notifications")}
        />
        <ProfileMenuItem
          icon={Settings}
          label="Настройки приложения"
          onClick={() => navigate("/settings")}
        />
        {/* Тема оформления */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <ThemeToggle showLabels={false} compact />
          </div>
        </div>
        {/* Язык */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <span className="text-lg">🌐</span>
          </div>
          <div className="flex-1">
            <LanguageSelector compact showLabel={false} />
          </div>
        </div>
      </ProfileSection>

      {/* Информация */}
      <ProfileSection title="Информация">
        <ProfileMenuItem
          icon={HelpCircle}
          label="Поддержка"
          onClick={() => navigate("/support")}
        />
        <ProfileMenuItem
          icon={Info}
          label="О приложении"
          onClick={() => navigate("/about")}
        />
      </ProfileSection>

      {/* Выход и удаление */}
      <div className="mt-6 bg-white dark:bg-gray-800">
        <ProfileMenuItem
          icon={LogOut}
          label={logoutMutation.isPending ? "Выход..." : "Выйти из аккаунта"}
          onClick={handleLogout}
          showChevron={false}
        />
        <ProfileMenuItem
          icon={Trash2}
          label={deleteRequested ? "Запрос отправлен" : "Удалить аккаунт"}
          onClick={handleDeleteAccount}
          variant="danger"
          showChevron={false}
        />
      </div>

      {/* Topup Modal */}
      {showTopup && (
        <SimpleTopup onClose={() => setShowTopup(false)} />
      )}
    </div>
  );
};
