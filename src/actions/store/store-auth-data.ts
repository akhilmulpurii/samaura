// storage.ts
import { AuthenticationResult } from "@jellyfin/sdk/lib/generated-client/models";
import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import secureLocalStorage from "react-secure-storage";

interface AuthData {
  serverUrl: string;
  user: AuthenticationResult & { AccessToken: string };
  timestamp: number;
}

export class StoreAuthData {
  private static store: Store | null;
  private static AUTH_DATA_KEY = "jellyfin-auth";

  private static async getStore() {
    if (!this.store) {
      this.store = isTauri() ? await Store.load("app.json") : null;
    }
    return this.store;
  }

  static async set(value: AuthData) {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        await store.set(this.AUTH_DATA_KEY, value);
        await store.save();
      }
    } else {
      secureLocalStorage.setItem(this.AUTH_DATA_KEY, value);
    }
  }

  static async get(): Promise<AuthData | null> {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        const val = await store.get(this.AUTH_DATA_KEY);
        // Type assertion to AuthData
        return val ? (val as AuthData) : null;
      }
      return null;
    } else {
      const val = secureLocalStorage.getItem(this.AUTH_DATA_KEY);
      if (!val) return null;

      try {
        // secureLocalStorage may store JSON strings, so parse it
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        return parsed as AuthData;
      } catch {
        return null;
      }
    }
  }
  static async remove() {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        await store.delete(this.AUTH_DATA_KEY);
        await store.save();
      }
    } else {
      secureLocalStorage.removeItem(this.AUTH_DATA_KEY);
    }
  }
}
