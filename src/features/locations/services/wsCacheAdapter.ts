import { QueryClient } from "@tanstack/react-query";
import type {
  WebSocketLocationUpdate,
  WebSocketStationUpdate,
  Location,
  StationStatusResponse,
  ConnectorStatus,
} from "../../../api/types";

interface StationWithConnectors {
  id: string;
  status: string;
  connectors: ConnectorStatus[];
}

/**
 * WebSocket to React Query Cache Adapter
 * Maps WebSocket events to cache updates
 */
export class WebSocketCacheAdapter {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Process WebSocket message and update appropriate cache entries
   */
  processMessage(data: WebSocketLocationUpdate | WebSocketStationUpdate): void {
    switch (data.type) {
      case "location_status_update":
        this.handleLocationUpdate(data);
        break;
      case "station_status_update":
        this.handleStationUpdate(data);
        break;
      default:
        console.warn("Unknown WebSocket message type:", data);
    }
  }

  /**
   * Handle location status update
   */
  private handleLocationUpdate(data: WebSocketLocationUpdate): void {
    // Update locations list cache
    this.queryClient.setQueryData(
      ["locations"],
      (oldData: Location[] | undefined) => {
        if (!oldData) return oldData;

        return oldData.map((location) =>
          location.id === data.location_id
            ? {
                ...location,
                status: data.status,
                stations_summary: data.stations_summary,
              }
            : location,
        );
      },
    );

    // Update individual location cache entries
    this.queryClient.setQueryData(
      ["location", data.location_id, true],
      (oldData: Location | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status: data.status,
          stations_summary: data.stations_summary,
        };
      },
    );

    this.queryClient.setQueryData(
      ["location", data.location_id, false],
      (oldData: Location | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status: data.status,
          stations_summary: data.stations_summary,
        };
      },
    );

    // If we don't have the location in cache, invalidate to fetch it
    const hasLocation = this.queryClient.getQueryData([
      "location",
      data.location_id,
      true,
    ]);
    if (!hasLocation) {
      this.queryClient.invalidateQueries({
        queryKey: ["location", data.location_id],
        exact: false,
      });
    }
  }

  /**
   * Handle station status update
   */
  private handleStationUpdate(data: WebSocketStationUpdate): void {
    // Update station status cache
    this.queryClient.setQueryData(
      ["station-status", data.station_id],
      (oldData: StationStatusResponse | undefined) => {
        if (!oldData) {
          // If no existing data, invalidate to fetch
          this.queryClient.invalidateQueries({
            queryKey: ["station-status", data.station_id],
          });
          return oldData;
        }

        return {
          ...oldData,
          station_status: data.status,
          connectors: data.connectors,
          available_connectors: data.connectors.filter((c) => c.available)
            .length,
          occupied_connectors: data.connectors.filter((c) => !c.available)
            .length,
          faulted_connectors: data.connectors.filter(
            (c) =>
              c.status === "Faulted" ||
              ("error_code" in c && c.error_code !== undefined),
          ).length,
        };
      },
    );

    // Update stations list if we have it cached
    this.queryClient.setQueryData(
      ["stations"],
      (oldData: StationWithConnectors[] | undefined) => {
        if (!oldData) return oldData;

        return oldData.map((station) =>
          station.id === data.station_id
            ? {
                ...station,
                status: data.status,
                connectors: data.connectors,
              }
            : station,
        );
      },
    );
  }

  /**
   * Invalidate queries for a specific key pattern
   */
  invalidateQueries(queryKey: string[]): void {
    this.queryClient.invalidateQueries({ queryKey });
  }

  /**
   * Get query data for inspection/debugging
   */
  getQueryData(queryKey: string[]): unknown {
    return this.queryClient.getQueryData(queryKey);
  }
}

/**
 * Create and configure WebSocket cache adapter
 */
export function createWsCacheAdapter(
  queryClient: QueryClient,
): WebSocketCacheAdapter {
  return new WebSocketCacheAdapter(queryClient);
}
