type StoreName = "library" | "progress" | "history" | "outbox" | "settingsOutbox" | "libraryOutbox";

const DB_NAME = "pachimanga";
const DB_VERSION = 4;

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function fallbackKey(store: StoreName) {
  return `pachimanga:${store}`;
}

function storeKeyField(store: StoreName) {
  if (store === "library" || store === "history") return "mangaId";
  if (store === "settingsOutbox") return "userId";
  if (store === "libraryOutbox") return "key";
  return "chapterId";
}

function readFallback<T>(store: StoreName): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(fallbackKey(store)) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeFallback<T extends Record<string, unknown>>(
  store: StoreName,
  key: keyof T,
  value: T,
) {
  const items = readFallback<T>(store);
  const next = items.filter((item) => item[key] !== value[key]);
  next.push(value);
  localStorage.setItem(fallbackKey(store), JSON.stringify(next));
}

function deleteFallback<T extends Record<string, unknown>>(
  store: StoreName,
  key: keyof T,
  value: unknown,
) {
  const items = readFallback<T>(store);
  localStorage.setItem(
    fallbackKey(store),
    JSON.stringify(items.filter((item) => item[key] !== value)),
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("library")) {
        db.createObjectStore("library", { keyPath: "mangaId" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "chapterId" });
      }
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "mangaId" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "chapterId" });
      }
      if (!db.objectStoreNames.contains("settingsOutbox")) {
        db.createObjectStore("settingsOutbox", { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains("libraryOutbox")) {
        db.createObjectStore("libraryOutbox", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  if (!hasIndexedDb()) return readFallback<T>(store);
  try {
    const db = await openDb();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return readFallback<T>(store);
  }
}

export async function idbCount(store: StoreName): Promise<number> {
  if (!hasIndexedDb()) return readFallback(store).length;
  try {
    const db = await openDb();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return readFallback(store).length;
  }
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const keyField = storeKeyField(store);
  if (!hasIndexedDb()) {
    return readFallback<Record<string, unknown>>(store).find((item) => item[keyField] === key) as
      | T
      | undefined;
  }
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return readFallback<Record<string, unknown>>(store).find((item) => item[keyField] === key) as
      | T
      | undefined;
  }
}

export async function idbPut<T extends Record<string, unknown>>(
  store: StoreName,
  value: T,
): Promise<void> {
  const keyField = storeKeyField(store) as keyof T;
  if (!hasIndexedDb()) {
    writeFallback(store, keyField, value);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(store, keyField, value);
  }
}

export async function idbDelete(
  store: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const keyField = storeKeyField(store);
  if (!hasIndexedDb()) {
    deleteFallback(store, keyField, key);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    deleteFallback(store, keyField, key);
  }
}

export async function idbClear(store: StoreName): Promise<void> {
  if (typeof window !== "undefined") localStorage.removeItem(fallbackKey(store));
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback storage was already cleared above.
  }
}
