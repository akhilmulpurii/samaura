// storage.ts
import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import secureLocalStorage from "react-secure-storage";

export class StoreServerURL {
  private static store: Store | null;
  private static SERVER_URL_KEY = "jellyfin-server-url";

  private static async getStore() {
    if (!this.store) {
      this.store = isTauri() ? await Store.load("app.json") : null;
    }
    return this.store;
  }

  static async set(value: string) {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        await store.set(this.SERVER_URL_KEY, value);
        await store.save();
      }
    } else {
      secureLocalStorage.setItem(this.SERVER_URL_KEY, value);
    }
  }

  static async get(): Promise<string | null> {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        const val = await store.get(this.SERVER_URL_KEY);
        return val !== undefined || null ? String(val) : null;
      } else return null;
    } else {
      const val = secureLocalStorage.getItem(this.SERVER_URL_KEY);
      return val ? String(val) : null;
    }
  }

  static async remove() {
    if (isTauri()) {
      const store = await this.getStore();
      if (store) {
        await store.delete(this.SERVER_URL_KEY);
        await store.save();
      }
    } else {
      secureLocalStorage.removeItem(this.SERVER_URL_KEY);
    }
  }
}
