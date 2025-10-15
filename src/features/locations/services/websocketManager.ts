import type {
  WebSocketMessage,
  WebSocketLocationUpdate,
  WebSocketStationUpdate,
} from "../../../api/types";
import {
  supabase,
  supabaseWithTimeout,
  isSupabaseConfigured,
} from "../../../shared/utils/supabaseHelpers";

type WebSocketUpdateHandler = (
  data: WebSocketLocationUpdate | WebSocketStationUpdate,
) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private handlers = new Set<WebSocketUpdateHandler>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private clientId: string | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Получение WebSocket URL с client_id
   * Возвращает null если пользователь не авторизован или Supabase не сконфигурирован
   */
  private async getWebSocketUrl(): Promise<string | null> {
    // Если Supabase не сконфигурирован, WebSocket недоступен
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      // Получаем текущего пользователя из Supabase с timeout
      const { data, error } = await supabaseWithTimeout(
        () => supabase.auth.getUser(),
        2000,
        { data: { user: undefined as any }, error: null },
      );

      const user = data?.user ?? null;
      if (error || !user?.id) {
        // WebSocket требует авторизации - пропускаем подключение
        return null;
      }

      this.clientId = user.id;

      // В dev — используем proxy от текущего origin; в prod — VITE_WS_URL или VITE_API_URL (http->ws)
      const wsEnv: string | undefined = (import.meta as any).env?.VITE_WS_URL;
      const apiEnv: string | undefined = (import.meta as any).env?.VITE_API_URL;
      const wsBase = import.meta.env.PROD
        ? wsEnv ||
          (apiEnv
            ? apiEnv.replace(/^http/i, "ws")
            : location.origin.replace(/^http/i, "ws"))
        : location.origin.replace(/^http/i, "ws");
      const baseUrl = `${wsBase}/api/v1/ws/locations`;

      // Добавляем client_id
      const finalUrl = `${baseUrl}?client_id=${this.clientId}`;
      return finalUrl;
    } catch (error) {
      return null;
    }
  }

  /**
   * Подключение к WebSocket серверу
   * Требует авторизации пользователя
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Уже подключен
    }

    try {
      const wsUrl = await this.getWebSocketUrl();

      if (!wsUrl) {
        // Пользователь не авторизован - WebSocket недоступен
        // Приложение будет работать без real-time обновлений
        return;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WebSocket] Connected");
        this.reconnectAttempts = 0;

        // Восстанавливаем подписки после переподключения
        this.subscriptions.forEach((channel) => {
          this.sendSubscription("subscribe", channel);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("[WebSocket] Parse error:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("[WebSocket] Disconnected:", event.code);
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        // Ошибка уже залогирована в onclose, не дублируем
      };
    } catch (error) {
      console.error("Ошибка создания WebSocket подключения:", error);
      this.handleDisconnect();
    }
  }

  /**
   * Отключение от WebSocket сервера
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    console.log("WebSocket отключен пользователем");
  }

  /**
   * Подписка на канал обновлений
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription("subscribe", channel);
    }
  }

  /**
   * Отписка от канала обновлений
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription("unsubscribe", channel);
    }
  }

  /**
   * Добавление обработчика обновлений
   */
  addUpdateHandler(handler: WebSocketUpdateHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Удаление обработчика обновлений
   */
  removeUpdateHandler(handler: WebSocketUpdateHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Получение состояния подключения
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Получение списка активных подписок
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private sendSubscription(
    action: "subscribe" | "unsubscribe",
    channel: string,
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = { type: action, data: { channel } };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WebSocket] Send error for channel ${channel}:`, error);
    }
  }

  private handleMessage(data: any): void {
    // Обрабатываем обновления локаций и станций
    if (
      data.type === "location_status_update" ||
      data.type === "station_status_update"
    ) {
      this.handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error("Ошибка в обработчике WebSocket сообщения:", error);
        }
      });
    }
  }

  private handleDisconnect(): void {
    // В dev режиме без настроенного Supabase не пытаемся переподключаться
    if (!isSupabaseConfigured()) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff с максимумом 30 сек

      console.log(
        `[WebSocket] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
      );

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.log("[WebSocket] Max reconnection attempts reached");
    }
  }
}

export const websocketManager = WebSocketManager.getInstance();
