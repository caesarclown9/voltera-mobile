import type { Session } from "@supabase/supabase-js";

export interface Client {
  id: string; // UUID из auth.users
  email: string;
  name?: string; // Nullable
  phone?: string; // Nullable
  balance: number; // В СОМАХ (не копейках!)
  status: "active" | "inactive" | "blocked";
  favorite_stations?: string[];
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export type User = Client;

export interface AuthResponse {
  success: boolean;
  client?: Client;
  session?: Session; // Supabase Session
  message?: string;
  // Убрали token и refreshToken - Supabase управляет ими автоматически
}

export interface AuthState {
  isAuthenticated: boolean;
  client: Client | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}
