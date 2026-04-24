import '@testing-library/jest-dom/vitest';

function createStorageMock() {
  let store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store = new Map<string, string>();
    },
  };
}

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
  configurable: true,
});
