import {
  OpenSubtitlesConfig,
  setOpenSubtitlesConfig,
  getOpenSubtitlesConfig,
  removeOpenSubtitlesConfig,
  getOpenSubtitlesStatus,
} from "./server-actions";

export class StoreOpenSubtitlesData {
  static async set(value: OpenSubtitlesConfig) {
    return setOpenSubtitlesConfig(value);
  }

  static async get(): Promise<OpenSubtitlesConfig | null> {
    return getOpenSubtitlesConfig();
  }

  static async remove() {
    return removeOpenSubtitlesConfig();
  }

  // Safe to call from the client: never returns the apiKey/password.
  static async status() {
    return getOpenSubtitlesStatus();
  }
}
