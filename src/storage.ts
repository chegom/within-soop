const STORAGE_NAMESPACE = "within-soop";
const LEGACY_STORAGE_NAMESPACE = "gyeot";

function storageKey(namespace: string, key: string) {
  return `${namespace}:${key}`;
}

export function readStoredValue(key: string) {
  const currentKey = storageKey(STORAGE_NAMESPACE, key);
  const currentValue = localStorage.getItem(currentKey);
  if (currentValue !== null) return currentValue;

  const legacyValue = localStorage.getItem(storageKey(LEGACY_STORAGE_NAMESPACE, key));
  if (legacyValue !== null) localStorage.setItem(currentKey, legacyValue);
  return legacyValue;
}

export function writeStoredValue(key: string, value: string) {
  localStorage.setItem(storageKey(STORAGE_NAMESPACE, key), value);
}

export function removeStoredValue(key: string) {
  localStorage.removeItem(storageKey(STORAGE_NAMESPACE, key));
  localStorage.removeItem(storageKey(LEGACY_STORAGE_NAMESPACE, key));
}
