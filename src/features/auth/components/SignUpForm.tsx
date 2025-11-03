import { useState } from "react";
import { useSignUp } from "../hooks/useAuth";

interface SignUpFormProps {
  onSuccess: () => void;
  onSwitchToSignIn: () => void;
}

export function SignUpForm({ onSuccess, onSwitchToSignIn }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  // Автопрефикс для Кыргызстана: +996. Поле никогда не очищается ниже этого префикса
  const [phone, setPhone] = useState("+996");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const signUpMutation = useSignUp();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    // Проверка формата телефона (начинается с + и содержит 10-15 цифр)
    const re = /^\+\d{10,15}$/;
    return re.test(phone.replace(/\s/g, ""));
  };

  const handlePhoneChange = (value: string) => {
    // Разрешаем только цифры, навязываем код страны 996
    const digitsOnly = value.replace(/\D/g, "");
    const withKGPrefix = digitsOnly.startsWith("996")
      ? digitsOnly
      : `996${digitsOnly}`;
    // Ограничим общую длину номера: +996 и до 9 цифр (стандарт KG)
    const limited = withKGPrefix.slice(0, 12); // 3 (код) + 9 цифр = 12
    setPhone(`+${limited}`);
  };

  const isValid =
    validateEmail(email) &&
    validatePhone(phone) &&
    password.length >= 6 &&
    password === confirmPassword &&
    ageConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    try {
      const result = await signUpMutation.mutateAsync({
        email,
        phone,
        password,
      });
      if (result.success) {
        onSuccess();
      }
    } catch {
      // Ошибка обрабатывается в мутации
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mx-auto mb-4">
          <img
            src="/icons/voltera-logo-horizontal.png"
            alt="Voltera"
            className="h-16 w-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Регистрация в Voltera
        </h2>
        <p className="text-gray-600">Создайте новый аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${
              email && !validateEmail(email)
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-green-500 focus:ring-green-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="example@mail.com"
            required
          />
          {email && !validateEmail(email) && (
            <p className="mt-1 text-sm text-red-600">
              Введите корректный email
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-phone"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Номер телефона
          </label>
          <input
            type="tel"
            id="signup-phone"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onFocus={() => {
              if (!phone || phone === "+") setPhone("+996");
            }}
            className={`w-full px-4 py-3 rounded-xl border ${
              phone && !validatePhone(phone)
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-green-500 focus:ring-green-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="+996 XXX XXX XXX"
            required
          />
          {phone && !validatePhone(phone) && (
            <p className="mt-1 text-sm text-red-600">
              Введите корректный номер телефона (например: +996500123456)
            </p>
          )}
        </div>

        {/* Captcha отключена по требованию. */}

        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="signup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${
                password && password.length < 6
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-green-500 focus:ring-green-500"
              } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 pr-12`}
              placeholder="Минимум 6 символов"
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
            <p className="mt-1 text-sm text-red-600">
              Пароль должен быть не менее 6 символов
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="signup-confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Подтвердите пароль
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="signup-confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border ${
              confirmPassword && password !== confirmPassword
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-green-500 focus:ring-green-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="Повторите пароль"
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-red-600">Пароли не совпадают</p>
          )}
        </div>

        {/* Age Confirmation (18+) - Required by Google Play */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-2 cursor-pointer"
              required
            />
            <span className="text-sm text-gray-700 select-none">
              Подтверждаю, что мне исполнилось{" "}
              <span className="font-semibold text-gray-900">18 лет</span> и я
              принимаю{" "}
              <a
                href="/legal/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Условия использования
              </a>{" "}
              и{" "}
              <a
                href="/legal/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Политику конфиденциальности
              </a>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid || signUpMutation.isPending}
        >
          {signUpMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Регистрация...
            </div>
          ) : (
            "Зарегистрироваться"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Уже есть учетная запись?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-cyan-600 hover:text-cyan-700 font-medium underline"
          >
            Войти
          </button>
        </p>
      </div>

      {signUpMutation.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            {signUpMutation.error instanceof Error &&
            signUpMutation.error.message
              ? `Ошибка при регистрации: ${signUpMutation.error.message}`
              : "Ошибка при регистрации. Возможно, этот email уже используется."}
          </p>
        </div>
      )}
    </div>
  );
}
