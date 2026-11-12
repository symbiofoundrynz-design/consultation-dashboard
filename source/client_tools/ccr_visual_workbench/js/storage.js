(function (global) {
  'use strict';

  const CCR = global.CCRVisual = global.CCRVisual || {};
  const Core = CCR.Core;
  const DB_NAME = 'ccr_visual_workbench';
  const DB_VERSION = 1;
  const SESSION_STORE = 'session';
  const CONFIG_STORE = 'configs';
  const fallback = { session: new Map(), configs: new Map() };
  let dbPromise = null;

  function openDatabase() {
    if (!('indexedDB' in global)) return Promise.reject(new Error('IndexedDB is unavailable.'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(CONFIG_STORE)) db.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open browser storage.'));
    });
    return dbPromise;
  }

  async function transact(storeName, mode, operation) {
    try {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Storage operation failed.'));
      });
    } catch (error) {
      return fallbackOperation(storeName, operation.__fallback, error);
    }
  }

  function fallbackOperation(storeName, action, error) {
    const store = fallback[storeName];
    if (!action) throw error;
    return action(store);
  }

  async function saveLastImport(raw, sourceName) {
    const record = { key: 'lastImport', raw, sourceName, savedAt: new Date().toISOString() };
    const operation = (store) => store.put(record);
    operation.__fallback = (store) => { store.set(record.key, record); return record.key; };
    return transact(SESSION_STORE, 'readwrite', operation);
  }

  async function getLastImport() {
    const operation = (store) => store.get('lastImport');
    operation.__fallback = (store) => store.get('lastImport');
    return transact(SESSION_STORE, 'readonly', operation);
  }

  async function forgetLastImport() {
    const operation = (store) => store.delete('lastImport');
    operation.__fallback = (store) => store.delete('lastImport');
    return transact(SESSION_STORE, 'readwrite', operation);
  }

  function makeId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function saveConfig(config, name, existingId) {
    const now = new Date().toISOString();
    const record = {
      id: existingId || makeId(),
      name: Core.text(name, 'Untitled chart'),
      schema_version: Core.CONFIG_SCHEMA_VERSION,
      tool: Core.TOOL_ID,
      created_at: config.created_at || now,
      updated_at: now,
      config: Core.clone(config)
    };
    const operation = (store) => store.put(record);
    operation.__fallback = (store) => { store.set(record.id, record); return record.id; };
    await transact(CONFIG_STORE, 'readwrite', operation);
    return record;
  }

  async function listConfigs() {
    const operation = (store) => store.getAll();
    operation.__fallback = (store) => Array.from(store.values());
    const records = await transact(CONFIG_STORE, 'readonly', operation);
    return (records || []).sort((a, b) => Core.text(b.updated_at).localeCompare(Core.text(a.updated_at)));
  }

  async function getConfig(id) {
    const operation = (store) => store.get(id);
    operation.__fallback = (store) => store.get(id);
    return transact(CONFIG_STORE, 'readonly', operation);
  }

  async function deleteConfig(id) {
    const operation = (store) => store.delete(id);
    operation.__fallback = (store) => store.delete(id);
    return transact(CONFIG_STORE, 'readwrite', operation);
  }

  async function clearConfigs() {
    const operation = (store) => store.clear();
    operation.__fallback = (store) => store.clear();
    return transact(CONFIG_STORE, 'readwrite', operation);
  }

  function savePreference(key, value) {
    try { localStorage.setItem(`ccrvw:${key}`, JSON.stringify(value)); } catch (_) { /* preference persistence is optional */ }
  }

  function getPreference(key, fallbackValue) {
    try {
      const raw = localStorage.getItem(`ccrvw:${key}`);
      return raw === null ? fallbackValue : JSON.parse(raw);
    } catch (_) {
      return fallbackValue;
    }
  }

  CCR.Storage = {
    saveLastImport,
    getLastImport,
    forgetLastImport,
    saveConfig,
    listConfigs,
    getConfig,
    deleteConfig,
    clearConfigs,
    savePreference,
    getPreference
  };
})(window);
