import { useState } from "react";
import { useLogin } from "../hooks/useAuth";

interface Props {
  onSuccess?: (email: string) => void;
}

export function LoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const login = useLogin();

  const isEmailValid = /.+@.+\..+/.test(email);
  const canSubmit = isEmailValid && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await login.mutateAsync({ email, password });
    onSuccess?.(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input
          aria-label="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Пароль
        <input
          aria-label="пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" disabled={!canSubmit}>
        {isSignup ? "Зарегистрироваться" : "Войти"}
      </button>
      <button type="button" onClick={() => setIsSignup((v) => !v)}>
        {isSignup ? "Есть аккаунт?" : "Нет аккаунта?"}
      </button>
    </form>
  );
}
