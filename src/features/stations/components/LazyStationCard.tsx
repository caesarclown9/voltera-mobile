import React from "react";
import { LazyLoad, LazyImage } from "../../../shared/components/LazyLoad";
import { MapPin, Zap, Clock } from "lucide-react";

interface Station {
  id: string;
  name: string;
  address: string;
  distance?: number;
  imageUrl?: string;
  availableConnectors: number;
  totalConnectors: number;
  status: "available" | "busy" | "offline";
  power: number;
}

interface LazyStationCardProps {
  station: Station;
  onClick: (station: Station) => void;
}

/**
 * Оптимизированная карточка станции с lazy loading
 */
export const LazyStationCard: React.FC<LazyStationCardProps> = ({
  station,
  onClick,
}) => {
  const statusColors = {
    available: "text-green-600 bg-green-100",
    busy: "text-yellow-600 bg-yellow-100",
    offline: "text-gray-600 bg-gray-100",
  };

  const statusLabels = {
    available: "Доступна",
    busy: "Занята",
    offline: "Недоступна",
  };

  return (
    <LazyLoad
      placeholder={
        <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      }
      rootMargin="50px"
      threshold={0.1}
    >
      <div
        onClick={() => onClick(station)}
        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex gap-4">
          {/* Изображение станции с lazy loading */}
          {station.imageUrl && (
            <div className="w-24 h-24 flex-shrink-0">
              <LazyImage
                src={station.imageUrl}
                alt={station.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}

          <div className="flex-1">
            {/* Заголовок */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{station.name}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[station.status]}`}
              >
                {statusLabels[station.status]}
              </span>
            </div>

            {/* Адрес и расстояние */}
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <MapPin size={14} />
              <span>{station.address}</span>
              {station.distance && (
                <span className="ml-2 text-primary-600 font-medium">
                  {station.distance < 1
                    ? `${Math.round(station.distance * 1000)} м`
                    : `${station.distance.toFixed(1)} км`}
                </span>
              )}
            </div>

            {/* Информация о коннекторах */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Zap size={14} className="text-primary-600" />
                <span className="text-gray-700">
                  {station.availableConnectors}/{station.totalConnectors}{" "}
                  свободно
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-gray-500" />
                <span className="text-gray-700">{station.power} кВт</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LazyLoad>
  );
};
