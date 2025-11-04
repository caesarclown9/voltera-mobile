import { useState } from "react";
import { useSignIn } from "../hooks/useAuth";
import { useAuthStore } from "../store";
import { authService } from "../services/authService";

interface SignInFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
}

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const [loginField, setLoginField] = useState(""); // Может быть email или телефон
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [canRestore, setCanRestore] = useState(false);
  const [restoreInfo, setRestoreInfo] = useState<string | null>(null);

  const signInMutation = useSignIn();
  const { login } = useAuthStore();

  const isPhoneNumber = (value: string) => {
    // Разрешаем ввод без '+' — минимальная проверка на цифры 9-15
    const digits = value.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  };

  const isEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const isValidLogin = isPhoneNumber(loginField) || isEmail(loginField);
  const isValid = isValidLogin && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    try {
      // Нормализуем телефон к формату +996XXXXXXXXX, если введён телефон
      const digits = loginField.replace(/\D/g, "");
      const normalizedPhone = digits
        ? digits.length === 9 && !digits.startsWith("996")
          ? `+996${digits}`
          : digits.startsWith("996")
            ? `+${digits}`
            : digits.startsWith("0") && digits.length === 10
              ? `+996${digits.substring(1)}`
              : `+${digits}`
        : "";

      const loginData = isPhoneNumber(loginField)
        ? { phone: normalizedPhone, password }
        : { email: loginField, password };

      const result = await signInMutation.mutateAsync(loginData);

      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      // Если аккаунт деактивирован — показ блока восстановления
      const message = (error as Error)?.message || "";
      if (/деактивирован/i.test(message)) {
        // Скрываем красную ошибку, так как дальше будет блок восстановления
        try {
          signInMutation.reset();
        } catch {
          // Ignore reset errors
        }
        setCanRestore(true);
        setRestoreInfo(
          "Аккаунт деактивирован или в процессе удаления. Вы можете восстановить доступ.",
        );
      }
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const { supabase } = await import("@/shared/config/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRestoreInfo(
          "Не удалось определить пользователя. Повторите попытку входа.",
        );
        setIsRestoring(false);
        return;
      }
      const { error: rpcErr } = await supabase.rpc("restore_account");
      if (rpcErr) {
        const { error: updErr } = await supabase
          .from("clients")
          .update({ status: "active", delete_requested_at: null })
          .eq("id", user.id);
        if (updErr) throw updErr;
      }
      // Пытаемся сразу авторизовать пользователя по активной сессии
      const client = await authService.getCurrentUser();
      if (client) {
        // Убираем возможную ошибку авторизации
        try {
          signInMutation.reset();
        } catch {
          // Ignore reset errors
        }
        const unifiedUser = {
          id: client.id,
          email: client.email,
          phone: client.phone || null,
          name: client.name || "User",
          balance: client.balance || 0,
          status: "active" as const,
          favoriteStations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        login(unifiedUser);
        setCanRestore(false);
        setRestoreInfo("Аккаунт восстановлен.");
        onSuccess();
        return;
      }
      // Для редкого случая, когда клиента ещё нет — всё равно убираем ошибку входа
      try {
        signInMutation.reset();
      } catch {
        // Ignore reset errors
      }
      setRestoreInfo("Аккаунт восстановлен. Введите пароль и войдите снова.");
      setCanRestore(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "ошибка";
      setRestoreInfo("Не удалось восстановить: " + errorMessage);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mx-auto mb-4">
          <img
            src="/icons/voltera-logo-horizontal.svg"
            alt="Voltera"
            className="h-16 w-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Вход в Voltera
        </h2>
        <p className="text-gray-600">Войдите в свой аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="signin-login"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Номер/Почта
          </label>
          <input
            type="text"
            id="signin-login"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${
              loginField && !isValidLogin
                ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="+996 XXX XXX XXX или email@example.com"
            required
          />
          {loginField && !isValidLogin && (
            <p className="mt-1 text-sm text-error-600">
              Введите корректный номер телефона или email
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="signin-password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="signin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${
                password && password.length < 6
                  ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                  : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 pr-12`}
              placeholder="Введите пароль"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          {password && password.length < 6 && (
            <p className="mt-1 text-sm text-error-600">
              Пароль должен быть не менее 6 символов
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-primary text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid || signInMutation.isPending}
        >
          {signInMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Вход...
            </div>
          ) : (
            "Войти"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Нет учетной записи?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>

      {signInMutation.error && !canRestore && (
        <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">
            Неверный логин или пароль. Попробуйте еще раз.
          </p>
        </div>
      )}

      {canRestore && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800 mb-3">{restoreInfo}</p>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {isRestoring ? "Восстанавливаем…" : "Восстановить доступ"}
          </button>
        </div>
      )}
    </div>
  );
}
