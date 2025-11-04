import { useState } from "react";
import { useSignUp } from "../hooks/useAuth";
import { ErrorModal } from "../../../shared/components/ErrorModal";

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
  const [emailConfirmationRequired, setEmailConfirmationRequired] =
    useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        // Если session отсутствует - требуется подтверждение email
        if (!result.session) {
          setEmailConfirmationRequired(true);
          return;
        }

        // Если session есть - email подтвержден автоматически, можно входить
        onSuccess();
      }
    } catch (error) {
      // Показываем ошибку в модальном окне
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось зарегистрировать пользователя. Попробуйте позже.";
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  // Если требуется подтверждение email - показываем специальное сообщение
  if (emailConfirmationRequired) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mx-auto mb-4">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Подтвердите ваш email
          </h2>
          <p className="text-gray-600">
            Мы отправили письмо с подтверждением на
          </p>
          <p className="text-primary-600 font-semibold mt-1">{email}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <svg
              className="w-5 h-5 text-blue-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Что дальше?
          </h3>
          <ol className="text-sm text-gray-700 space-y-2 ml-7">
            <li className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <span>Откройте ваш почтовый ящик</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <span>
                Найдите письмо от Voltera (проверьте папку &quot;Спам&quot;,
                если письма нет во &quot;Входящих&quot;)
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <span>Нажмите на ссылку подтверждения в письме</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">4.</span>
              <span>Вернитесь сюда и войдите в приложение</span>
            </li>
          </ol>
        </div>

        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="w-full bg-gradient-primary text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Перейти ко входу
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Не получили письмо?{" "}
            <button
              type="button"
              onClick={() => setEmailConfirmationRequired(false)}
              className="text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Попробовать снова
            </button>
          </p>
        </div>
      </div>
    );
  }

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
                ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="example@mail.com"
            required
          />
          {email && !validateEmail(email) && (
            <p className="mt-1 text-sm text-error-600">
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
                ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="+996 XXX XXX XXX"
            required
          />
          {phone && !validatePhone(phone) && (
            <p className="mt-1 text-sm text-error-600">
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
                  ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                  : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
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
            <p className="mt-1 text-sm text-error-600">
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
                ? "border-error-300 focus:border-error-500 focus:ring-error-500"
                : "border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            } focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400`}
            placeholder="Повторите пароль"
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-error-600">Пароли не совпадают</p>
          )}
        </div>

        {/* Age Confirmation (18+) - Required by Google Play */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2 cursor-pointer"
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
                className="text-primary-600 hover:text-primary-700 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Условия использования
              </a>{" "}
              и{" "}
              <a
                href="/legal/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Политику конфиденциальности
              </a>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-primary text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            Войти
          </button>
        </p>
      </div>

      {/* ErrorModal для отображения ошибок в центре экрана */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Ошибка при регистрации"
        message={errorMessage}
      />
    </div>
  );
}
