declare module "*.css";
declare module "*.scss";
declare module "*.sass";

/// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_SECURE_COOKIE: string = false;
  readonly VITE_SERVER_BASE_URL: string;
  readonly MODE: "development" | "production";

  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
