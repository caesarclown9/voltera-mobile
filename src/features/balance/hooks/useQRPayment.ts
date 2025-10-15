import { useMutation, useQuery } from "@tanstack/react-query";
import { evpowerApi } from "@/services/evpowerApi";
import type { TopupQRResponse, PaymentStatus } from "@/services/evpowerApi";

export const useQRTopup = () => {
  return useMutation<
    TopupQRResponse,
    Error,
    { client_id: string; amount: number; description?: string }
  >({
    mutationFn: async (data) => {
      return await evpowerApi.topupWithQR(data.amount, data.description);
    },
  });
};

// Polling статуса платежа
export const usePaymentStatus = (invoiceId: string, enabled = false) => {
  return useQuery<PaymentStatus>({
    queryKey: ["payment-status", invoiceId],
    queryFn: async () => {
      return await evpowerApi.getPaymentStatus(invoiceId);
    },
    enabled,
    refetchInterval: (query) => {
      // Проверять каждые 5 секунд пока не оплачен
      if (query.state.data?.status === 1) return false; // Оплачен
      if (query.state.data?.invoice_expired) return false; // Истек
      return 5000; // 5 секунд
    },
    refetchOnWindowFocus: false,
    retry: false,
  });
};

// Отмена платежа - backend не поддерживает
export const useCancelPayment = () => {
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (_invoiceId) => {
      // Backend API не поддерживает отмену платежей
      console.warn("Cancel payment not supported by backend");
      return { success: false, message: "Not supported" };
    },
  });
};

// Комплексный хук для QR пополнения с автоматической проверкой статуса
export const useQRPaymentFlow = () => {
  const qrTopupMutation = useQRTopup();
  const cancelPaymentMutation = useCancelPayment();

  const createQRTopup = async (
    amount: number,
    clientId: string,
    description?: string,
  ) => {
    try {
      const result = await qrTopupMutation.mutateAsync({
        client_id: clientId,
        amount,
        description,
      });

      return {
        success: true,
        data: result,
        error: null,
      };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error:
          error instanceof Error ? error.message : "Ошибка создания QR кода",
      };
    }
  };

  const cancelPayment = async (invoiceId: string) => {
    try {
      const result = await cancelPaymentMutation.mutateAsync(invoiceId);
      return {
        success: true,
        message: result.message,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Ошибка отмены платежа",
      };
    }
  };

  return {
    createQRTopup,
    cancelPayment,
    isCreatingQR: qrTopupMutation.isPending,
    isCancelling: cancelPaymentMutation.isPending,
  };
};
