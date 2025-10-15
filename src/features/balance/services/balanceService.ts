import { evpowerApi } from "@/services/evpowerApi";

export const balanceService = {
  async getBalance(userId: string) {
    const balance = await evpowerApi.getBalance();
    return { balance, currency: "KGS" };
  },

  async generateTopUpQR(amount: number) {
    const res = await evpowerApi.topupWithQR(amount);
    // Возвращаем полный ответ + трансформированные поля для обратной совместимости
    return {
      ...res, // Включаем все поля от backend (qr, qr_url, invoice_id, link_app, etc)
      qrCode: res.qr_code_url || res.qr_url || res.qr_code || res.qr || "",
      paymentId: res.invoice_id || res.order_id || "",
      expiresAt:
        res.qr_expires_at ||
        res.invoice_expires_at ||
        new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      // Для удобства также мапим app_link
      payment_url: res.payment_url || res.link_app || res.app_link || "",
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
