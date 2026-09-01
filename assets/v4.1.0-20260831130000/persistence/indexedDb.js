const DB_NAME = 'OmegaZeroDB';
const DB_VERSION = 2;
const STORES = ['games', 'problems', 'assets', 'analysis'];

function available() { return typeof indexedDB !== 'undefined'; }

export function openOmegaDb() {
  if (!available()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transacción cancelada'));
  });
}

export async function getAll(storeName) {
  const db = await openOmegaDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function replaceAll(storeName, values = []) {
  const db = await openOmegaDb();
  if (!db) return;
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  for (const value of values) store.put(value);
  await transactionPromise(tx);
}

export async function put(storeName, value) {
  const db = await openOmegaDb();
  if (!db) return;
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await transactionPromise(tx);
}

export async function clearStores(storeNames = STORES) {
  const db = await openOmegaDb();
  if (!db) return;
  const tx = db.transaction(storeNames, 'readwrite');
  for (const storeName of storeNames) tx.objectStore(storeName).clear();
  await transactionPromise(tx);
}

export async function deleteDatabase() {
  if (!available()) return;
  const db = await openOmegaDb();
  db?.close();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
