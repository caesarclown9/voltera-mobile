import type { ReactNode } from "react";
import { AuthProvider } from "../features/auth/providers/AuthProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
