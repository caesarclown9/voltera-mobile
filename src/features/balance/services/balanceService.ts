import { evpowerApi, type TopupQRResponse } from "@/services/evpowerApi";

// Normalized response type for client usage
export interface NormalizedTopupQRResponse extends TopupQRResponse {
  qrCode: string;
  paymentId: string;
  expiresAt: string;
  payment_url?: string;
  link_app?: string;
}

export const balanceService = {
  async getBalance(_userId: string) {
    const balance = await evpowerApi.getBalance();
    return { balance, currency: "KGS" };
  },

  async generateTopUpQR(amount: number): Promise<NormalizedTopupQRResponse> {
    const res = await evpowerApi.topupWithQR(amount);
    // Возвращаем полный ответ + трансформированные поля для обратной совместимости
    // Backend может вернуть дополнительные поля помимо типизированного интерфейса
    const apiRes = res as unknown as Record<string, unknown>;
    return {
      ...res,
      qrCode:
        res.qr_code_url ||
        (apiRes["qr_url"] as string) ||
        res.qr_code ||
        (apiRes["qr"] as string) ||
        "",
      paymentId: res.invoice_id || res.order_id || "",
      expiresAt:
        res.qr_expires_at ||
        res.invoice_expires_at ||
        new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      // Для удобства также мапим app_link
      payment_url:
        (apiRes["payment_url"] as string) ||
        (apiRes["link_app"] as string) ||
        res.app_link ||
        "",
      link_app:
        (apiRes["link_app"] as string) ||
        (apiRes["payment_url"] as string) ||
        res.app_link ||
        "",
    };
  },

  async checkPaymentStatus(invoiceId: string): Promise<{
    status: "pending" | "success" | "failed";
    amount?: number;
    error?: string;
    createdAt?: string;
    completedAt?: string;
  }> {
    const res = await evpowerApi.getPaymentStatus(invoiceId);
    if (res.status_text === "approved" || res.can_start_charging) {
      return {
        status: "success",
        amount: res.paid_amount || res.amount || 0,
        completedAt: new Date().toISOString(),
      };
    }
    if (res.status_text === "canceled" || res.status_text === "refunded") {
      return { status: "failed", error: res.error || "Payment canceled" };
    }
    return {
      status: "pending",
      amount: res.amount || 0,
      createdAt: new Date().toISOString(),
    };
  },
};
