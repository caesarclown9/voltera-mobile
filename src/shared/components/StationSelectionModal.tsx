import { X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Station } from "@/api/types";

interface StationSelectionModalProps {
  stations: Station[];
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StationSelectionModal({
  stations,
  locationName,
  isOpen,
  onClose,
}: StationSelectionModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleStationSelect = (station: Station) => {
    // Проверяем доступность станции
    if (station.status !== "active" || !station.is_available) {
      // Станция недоступна - не переходим
      return;
    }
    navigate(`/charging/${station.serial_number}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)", // 4rem = 64px (высота BottomNavigation)
      }}
    >
      <div className="bg-white w-full max-h-[60vh] rounded-t-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">{locationName}</h2>
            <p className="text-gray-600 text-sm">
              {stations.length} станци
              {stations.length === 1 ? "я" : stations.length < 5 ? "и" : "й"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Station List */}
        <div className="overflow-y-auto max-h-[calc(60vh-80px)]">
          {stations.map((station) => {
            const connectorStatus = station.ocpp_status?.connector_status || [];
            const availableConnectors = connectorStatus.filter(
              (c) => c.status === "Available",
            ).length;
            const totalConnectors =
              connectorStatus.length || station.connectors_count;
            const isAvailable =
              station.status === "active" && station.is_available;

            return (
              <div
                key={station.id}
                onClick={() => handleStationSelect(station)}
                className={`p-4 border-b ${
                  isAvailable
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "opacity-50 cursor-not-allowed bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary-600" />
                    </div>

                    <div>
                      <h3 className="font-medium">{station.serial_number}</h3>
                      <p className="text-sm text-gray-600">{station.model}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {connectorStatus.map((connector) => (
                          <div
                            key={connector.connector_id}
                            className="flex items-center space-x-1"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                connector.status === "Available"
                                  ? "bg-green-500"
                                  : connector.status === "Charging"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                              }`}
                            />
                            <span className="text-xs text-gray-600">
                              Коннектор {connector.connector_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {availableConnectors}/{totalConnectors} свободно
                    </div>
                    <div className="text-xs text-gray-600">
                      {station.price_per_kwh} KGS/кВт⋅ч
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
