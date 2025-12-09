import { supabase } from "../../../shared/config/supabase";
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

  // Получить список избранных станций пользователя (location_id)
  async getFavorites(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("location_id")
        .eq("user_id", userId);

      if (error) {
        logger.error("Error fetching favorites:", error);
        return [];
      }

      return data?.map((f) => f.location_id) || [];
    } catch (error) {
      logger.error("Failed to fetch favorites:", error);
      return [];
    }
  }

  // Добавить станцию в избранное (location_id)
  async addToFavorites(userId: string, locationId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("user_favorites").insert({
        user_id: userId,
        location_id: locationId,
      });

      if (error) {
        // Если ошибка уникальности - значит уже в избранном, это нормально
        if (error.code === "23505") {
          return true;
        }
        logger.error("Error adding to favorites:", error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Failed to add to favorites:", error);
      return false;
    }
  }

  // Удалить локацию из избранного
  async removeFromFavorites(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("location_id", locationId);

      if (error) {
        logger.error("Error removing from favorites:", error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Failed to remove from favorites:", error);
      return false;
    }
  }

  // Переключить статус избранного
  async toggleFavorite(userId: string, stationId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites(userId);

      if (favorites.includes(stationId)) {
        return await this.removeFromFavorites(userId, stationId);
      } else {
        return await this.addToFavorites(userId, stationId);
      }
    } catch (error) {
      logger.error("Failed to toggle favorite:", error);
      return false;
    }
  }

  // Проверить, является ли станция избранной
  async isFavorite(userId: string, stationId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites(userId);
      return favorites.includes(stationId);
    } catch (error) {
      logger.error("Failed to check favorite status:", error);
      return false;
    }
  }
}

export const favoriteService = FavoriteService.getInstance();
