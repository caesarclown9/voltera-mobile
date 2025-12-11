/**
 * Favorite Service - управление избранными локациями
 *
 * ВАЖНО: Использует Backend API вместо прямых вызовов Supabase
 * для корректной работы авторизации (JWT через AuthMiddleware)
 */

import { evpowerApi } from "@/services/evpowerApi";
import { logger } from "@/shared/utils/logger";

export class FavoriteService {
  private static instance: FavoriteService;

  private constructor() {}

  static getInstance(): FavoriteService {
    if (!FavoriteService.instance) {
      FavoriteService.instance = new FavoriteService();
    }
    return FavoriteService.instance;
  }

  /**
   * Получить список избранных локаций пользователя
   *
   * @param _userId - Не используется (авторизация через JWT)
   * @returns Массив location_id
   */
  async getFavorites(_userId?: string): Promise<string[]> {
    try {
      return await evpowerApi.getFavorites();
    } catch (error) {
      logger.error("Failed to fetch favorites:", error);
      return [];
    }
  }

  /**
   * Добавить локацию в избранное
   *
   * @param _userId - Не используется (авторизация через JWT)
   * @param locationId - ID локации для добавления
   * @returns true если успешно
   */
  async addToFavorites(_userId: string, locationId: string): Promise<boolean> {
    try {
      return await evpowerApi.addToFavorites(locationId);
    } catch (error) {
      logger.error("Failed to add to favorites:", error);
      return false;
    }
  }

  /**
   * Удалить локацию из избранного
   *
   * @param _userId - Не используется (авторизация через JWT)
   * @param locationId - ID локации для удаления
   * @returns true если успешно
   */
  async removeFromFavorites(
    _userId: string,
    locationId: string,
  ): Promise<boolean> {
    try {
      return await evpowerApi.removeFromFavorites(locationId);
    } catch (error) {
      logger.error("Failed to remove from favorites:", error);
      return false;
    }
  }

  /**
   * Переключить статус избранного
   *
   * @param _userId - Не используется (авторизация через JWT)
   * @param locationId - ID локации
   * @returns true если операция успешна
   */
  async toggleFavorite(_userId: string, locationId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return await evpowerApi.toggleFavorite(locationId, favorites);
    } catch (error) {
      logger.error("Failed to toggle favorite:", error);
      return false;
    }
  }

  /**
   * Проверить, является ли локация избранной
   *
   * @param _userId - Не используется (авторизация через JWT)
   * @param locationId - ID локации
   * @returns true если в избранном
   */
  async isFavorite(_userId: string, locationId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.includes(locationId);
    } catch (error) {
      logger.error("Failed to check favorite status:", error);
      return false;
    }
  }
}

export const favoriteService = FavoriteService.getInstance();
