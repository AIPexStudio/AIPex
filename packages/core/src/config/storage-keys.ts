const PREFIX = "aipex_";

export const STORAGE_KEYS = {
  THEME: `${PREFIX}theme`,
  LANGUAGE: `${PREFIX}language`,
  SETTINGS: `${PREFIX}settings`,
  HOST_ACCESS_CONFIG: `${PREFIX}host_access_config`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
