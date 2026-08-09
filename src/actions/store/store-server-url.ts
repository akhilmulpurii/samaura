import { getServerUrl, setServerUrl, removeServerUrl } from "./server-actions";

export class StoreServerURL {
  static async set(value: string, options?: { persistent?: boolean }) {
    return setServerUrl(value, options);
  }

  static async get(): Promise<string | null> {
    return getServerUrl();
  }

  static async remove() {
    return removeServerUrl();
  }
}
