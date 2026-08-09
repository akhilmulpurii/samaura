import {
  getAuthData,
  setAuthData,
  removeAuthData,
  AuthData,
} from "./server-actions";

export class StoreAuthData {
  static async set(value: AuthData, options?: { persistent?: boolean }) {
    return setAuthData(value, options);
  }

  static async get(): Promise<AuthData | null> {
    return getAuthData();
  }

  static async remove() {
    return removeAuthData();
  }
}
