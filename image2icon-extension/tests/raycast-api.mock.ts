export const storage = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return storage.get(key) as T | undefined;
  },
  async setItem(key: string, value: string | number | boolean): Promise<void> {
    storage.set(key, String(value));
  },
};
