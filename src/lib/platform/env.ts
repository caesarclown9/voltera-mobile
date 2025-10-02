/**
 * Platform environment detection
 * Согласно RULES.md - единые паттерны во всех модулях
 */

import { Capacitor } from '@capacitor/core';

/**
 * Определяет, запущено ли приложение в нативной оболочке
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Определяет, запущено ли приложение в вебе (PWA)
 */
export const isWebPlatform = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Получает текущую платформу: 'ios' | 'android' | 'web'
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  return platform as 'ios' | 'android' | 'web';
};

/**
 * Определяет, запущено ли приложение на iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Определяет, запущено ли приложение на Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Получает информацию о платформе для логирования
 */
export const getPlatformInfo = () => {
  return {
    platform: getPlatform(),
    isNative: isNativePlatform(),
    isWeb: isWebPlatform(),
    isIOS: isIOS(),
    isAndroid: isAndroid()
  };
};