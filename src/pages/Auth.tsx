import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { SignInForm } from "../features/auth/components/SignInForm";
import { SignUpForm } from "../features/auth/components/SignUpForm";
import { useAuthStatus } from "../features/auth/hooks/useAuth";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStatus();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleAuthSuccess = () => {
    navigate("/", { replace: true });
  };

  const switchToSignUp = () => {
    setMode("signup");
  };

  const switchToSignIn = () => {
    setMode("signin");
  };

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="relative w-full max-w-md mx-4">
        <button
          aria-label="Назад"
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {mode === "signin" ? (
          <SignInForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={switchToSignUp}
          />
        ) : (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignIn={switchToSignIn}
          />
        )}
      </div>
    </div>
  );
}
