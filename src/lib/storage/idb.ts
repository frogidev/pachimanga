type StoreName = "library" | "progress" | "history";

const DB_NAME = "pachimanga";
const DB_VERSION = 1;

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function fallbackKey(store: StoreName) {
  return `pachimanga:${store}`;
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

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  if (!hasIndexedDb()) {
    const keyField = store === "library" || store === "history" ? "mangaId" : "chapterId";
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
    return undefined;
  }
}

export async function idbPut<T extends Record<string, unknown>>(
  store: StoreName,
  value: T,
): Promise<void> {
  const keyField = (store === "library" || store === "history" ? "mangaId" : "chapterId") as keyof T;
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
  const keyField = store === "library" || store === "history" ? "mangaId" : "chapterId";
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
