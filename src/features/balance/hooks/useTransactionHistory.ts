import { useQuery } from "@tanstack/react-query";
import { evpowerApi } from "@/services/evpowerApi";
import { useAuthStore } from "@/features/auth/store";

export interface PaymentTransaction {
  id: number;
  invoice_id: string;
  order_id: string;
  merchant_id: string;
  client_id: string;
  requested_amount: number;
  paid_amount: number | null;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "approved"
    | "paid"
    | "canceled"
    | "refunded"
    | "partial_refund";
  odengi_status: number;
  payment_provider: string;
  description?: string | null;
  qr_code_url?: string | null;
  app_link?: string | null;
  created_at: string;
  paid_at?: string | null;
  completed_at?: string | null;
  qr_expires_at?: string | null;
  invoice_expires_at?: string | null;
}

export const useTransactionHistory = (limit = 20) => {
  const { user } = useAuthStore();

  return useQuery<PaymentTransaction[]>({
    queryKey: ["transaction-history", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return await evpowerApi.getTransactionHistory(limit);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 секунд
    refetchInterval: 1000 * 60, // Обновлять каждую минуту
  });
};
