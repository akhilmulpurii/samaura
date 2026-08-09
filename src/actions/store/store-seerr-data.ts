import {
  SeerrAuthData,
  setSeerrData,
  getSeerrData,
  removeSeerrData,
} from "./server-actions";

export class StoreSeerrData {
  static async set(value: SeerrAuthData, options?: { persistent?: boolean }) {
    return setSeerrData(value, options);
  }

  static async get(): Promise<SeerrAuthData | null> {
    return getSeerrData();
  }

  static async remove() {
    return removeSeerrData();
  }
}
