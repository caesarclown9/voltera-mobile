import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";

const IDB_KEY = "EVPOWER_QUERY_CACHE";
const CACHE_VERSION = 5; // Убрана prefetchQuery с пустым queryFn, блокировавшая реальные запросы

export function createIDBPersister(idbValidKey: string = IDB_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, {
        ...client,
        clientState: {
          ...client.clientState,
          version: CACHE_VERSION,
        },
      });
    },
    restoreClient: async () => {
      const client = await get<PersistedClient>(idbValidKey);

      if (!client) return undefined;

      // Check cache version
      if ((client.clientState as any)?.version !== CACHE_VERSION) {
        await del(idbValidKey);
        return undefined;
      }

      return client;
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  };
}

// Query keys that should be persisted
export const PERSISTABLE_QUERY_KEYS = [
  "stations",
  "locations",
  "location",
  "station",
  "profile",
];

// Query keys that should NOT be persisted (real-time data)
export const NON_PERSISTABLE_QUERY_KEYS = [
  "charging",
  "status",
  "session",
  "payment",
];

export function shouldPersistQuery(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey)) return false;

  const firstKey = queryKey[0];
  if (typeof firstKey !== "string") return false;

  // Check if it's in the non-persistable list
  for (const nonPersistKey of NON_PERSISTABLE_QUERY_KEYS) {
    if (firstKey.toLowerCase().includes(nonPersistKey)) {
      return false;
    }
  }

  // Check if it's in the persistable list
  for (const persistKey of PERSISTABLE_QUERY_KEYS) {
    if (firstKey.toLowerCase().includes(persistKey)) {
      return true;
    }
  }

  return false;
}
