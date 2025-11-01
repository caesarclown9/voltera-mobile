import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  evpowerApi,
  handleApiError,
  type PaymentStatus,
} from "@/services/evpowerApi";
import { useAuthStore } from "@/features/auth/store";
import {
  balanceService,
  type NormalizedTopupQRResponse,
} from "../services/balanceService";

// Get balance query - берем из БД Supabase
export const useBalance = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["balance", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return await balanceService.getBalance(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 секунд
    refetchInterval: 1000 * 60, // Обновлять каждую минуту
  });
};

// QR Topup mutation
export const useQRTopup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation<
    NormalizedTopupQRResponse,
    Error,
    { amount: number; description?: string }
  >({
    mutationFn: async (data) => {
      if (!user?.id) throw new Error("User not authenticated");
      return await balanceService.generateTopUpQR(data.amount);
    },
    onSuccess: () => {
      // Invalidate balance to refresh after successful topup
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
  });
};

// Payment status polling
type UnifiedPaymentStatus = {
  status: "pending" | "success" | "failed";
  amount?: number;
  error?: string;
  createdAt?: string;
  completedAt?: string;
};

export const usePaymentStatus = (invoiceId: string | null, enabled = true) => {
  return useQuery<UnifiedPaymentStatus>({
    queryKey: ["payment-status", invoiceId],
    queryFn: async (): Promise<UnifiedPaymentStatus> => {
      if (!invoiceId) throw new Error("invoiceId required");
      return await balanceService.checkPaymentStatus(invoiceId);
    },
    enabled: enabled && !!invoiceId,
    refetchInterval: (query) => {
      const data = query.state.data as UnifiedPaymentStatus | undefined;
      if (!data) return 5000;
      return data.status === "pending" ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });
};

// Cancel payment mutation
// Note: Backend API не имеет endpoint для отмены платежа
// Платеж автоматически истекает через 10 минут
export const useCancelPayment = () => {
  return useMutation<void, Error, string>({
    mutationFn: async () => {
      // Placeholder - backend не поддерживает отмену
      console.warn("Cancel payment not supported by backend API");
    },
  });
};

// Payment monitoring hook (legacy support)
export function usePaymentMonitoring() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null,
  );
  const [monitoring, setMonitoring] = useState(false);

  const monitorPayment = useCallback(
    (
      invoiceId: string,
      onSuccess?: () => void,
      onError?: (error: string) => void,
    ) => {
      let attempts = 0;
      const maxAttempts = 40; // 40 attempts * 15 seconds = 10 minutes
      setMonitoring(true);

      const checkStatus = async () => {
        try {
          const status = await evpowerApi.getPaymentStatus(invoiceId);
          setPaymentStatus(status);

          // Payment successful
          if (status.status === 1) {
            setMonitoring(false);
            onSuccess?.();
            return;
          }

          // Payment canceled
          if (status.status === 2) {
            setMonitoring(false);
            onError?.("Платеж отменен");
            return;
          }

          // Payment expired
          if (status.qr_expired || status.invoice_expired) {
            setMonitoring(false);
            onError?.("Время оплаты истекло");
            return;
          }

          // Continue monitoring
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 15000); // Check every 15 seconds
          } else {
            setMonitoring(false);
            onError?.("Время ожидания оплаты истекло");
          }
        } catch (error) {
          setMonitoring(false);
          onError?.(handleApiError(error));
        }
      };

      // Start checking after 15 seconds
      setTimeout(checkStatus, 15000);
    },
    [],
  );

  const stopMonitoring = useCallback(() => {
    setMonitoring(false);
    setPaymentStatus(null);
  }, []);

  return {
    paymentStatus,
    monitoring,
    monitorPayment,
    stopMonitoring,
  };
}
