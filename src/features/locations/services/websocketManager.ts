import type {
  WebSocketMessage,
  WebSocketLocationUpdate,
  WebSocketStationUpdate
} from '../../../api/types';
import { supabase } from '../../../shared/config/supabase';

type WebSocketUpdateHandler = (data: WebSocketLocationUpdate | WebSocketStationUpdate) => void;

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
   * Возвращает null если пользователь не авторизован
   */
  private async getWebSocketUrl(): Promise<string | null> {
    // Получаем текущего пользователя из Supabase
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user?.id) {
      // WebSocket требует авторизации - пропускаем подключение
      return null;
    }

    this.clientId = user.id;

    const baseUrl = import.meta.env.VITE_WEBSOCKET_URL
      ? `${import.meta.env.VITE_WEBSOCKET_URL}/api/v1/ws/locations`
      : 'wss://ocpp.evpower.kg/api/v1/ws/locations';

    // Добавляем client_id
    const finalUrl = `${baseUrl}?client_id=${this.clientId}`;
    return finalUrl;
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
        console.log('🔗 WebSocket подключен');
        this.reconnectAttempts = 0;
        
        // Восстанавливаем подписки после переподключения
        this.subscriptions.forEach(channel => {
          this.sendSubscription('subscribe', channel);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Ошибка парсинга WebSocket сообщения:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket отключен:', event.code, event.reason);
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket ошибка:', error);
      };

    } catch (error) {
      console.error('Ошибка создания WebSocket подключения:', error);
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
    console.log('WebSocket отключен пользователем');
  }

  /**
   * Подписка на канал обновлений
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription('subscribe', channel);
    }
  }

  /**
   * Отписка от канала обновлений
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription('unsubscribe', channel);
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

  private sendSubscription(action: 'subscribe' | 'unsubscribe', channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = { type: action, data: { channel } };

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`📡 ${action} on channel:`, channel);
    } catch (error) {
      console.error(`Ошибка отправки ${action} для канала ${channel}:`, error);
    }
  }

  private handleMessage(data: any): void {
    // Обрабатываем обновления локаций и станций
    if (data.type === 'location_status_update' || data.type === 'station_status_update') {
      this.handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Ошибка в обработчике WebSocket сообщения:', error);
        }
      });
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff с максимумом 30 сек
      
      console.log(`🔄 Переподключение через ${delay/1000} сек (попытка ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('❌ Превышено максимальное количество попыток переподключения');
    }
  }
}

export const websocketManager = WebSocketManager.getInstance();