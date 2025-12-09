import { Zap, Clock, DollarSign, Calendar, ChevronRight } from "lucide-react";
import type { ChargingHistoryItem } from "../types";

interface ChargingHistoryCardProps {
  item: ChargingHistoryItem;
  onClick?: (item: ChargingHistoryItem) => void;
}

export function ChargingHistoryCard({
  item,
  onClick,
}: ChargingHistoryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}мин`;
    }
    return `${minutes} мин`;
  };

  const getStatusColor = () => {
    switch (item.status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "in_progress":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "stopped":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      case "failed":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case "completed":
        return "Завершена";
      case "in_progress":
        return "Заряжается";
      case "stopped":
        return "Остановлена";
      case "failed":
        return "Ошибка";
      default:
        return "Неизвестно";
    }
  };

  return (
    <div
      onClick={() => onClick?.(item)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {item.stationName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.stationAddress}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>

      {/* Date and Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(item.startTime)}</span>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* Energy */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <Zap className="w-3 h-3" />
            <span className="text-xs">Энергия</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {item.energyConsumed.toFixed(1)} кВт·ч
          </p>
        </div>

        {/* Duration */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Время</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {formatDuration(item.duration)}
          </p>
        </div>

        {/* Cost */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
            <DollarSign className="w-3 h-3" />
            <span className="text-xs">Стоимость</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {item.totalCost.toFixed(0)} сом
          </p>
        </div>
      </div>

      {/* Limit info if exists */}
      {item.limitType && item.limitType !== "none" && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Лимит:{" "}
            {item.limitType === "energy"
              ? `${item.limitValue} кВт·ч`
              : `${item.limitValue} сом`}
          </p>
        </div>
      )}
    </div>
  );
}
