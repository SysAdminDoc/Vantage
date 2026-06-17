(() => {
  const existingBrowser = globalThis.browser;

  if (globalThis.chrome?.storage?.local) {
    if (!globalThis.browser) globalThis.browser = globalThis.chrome;
    return;
  }
  if (existingBrowser?.storage?.local) {
    globalThis.chrome = globalThis.browser;
    return;
  }

  const STORAGE_KEY = "vantage:dev-chrome-storage";
  const listeners = new Set();

  function readStore() {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeStore(store) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Local development can run in privacy modes where localStorage is off.
    }
  }

  function pick(store, keys) {
    if (keys == null) return { ...store };
    if (typeof keys === "string") return { [keys]: store[keys] };
    if (Array.isArray(keys)) {
      return keys.reduce((acc, key) => {
        acc[key] = store[key];
        return acc;
      }, {});
    }
    if (typeof keys === "object") {
      return Object.keys(keys).reduce((acc, key) => {
        acc[key] = store[key] ?? keys[key];
        return acc;
      }, {});
    }
    return {};
  }

  function emitChanges(changes) {
    if (!Object.keys(changes).length) return;
    for (const listener of listeners) listener(changes, "local");
  }

  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          return pick(readStore(), keys);
        },
        async set(items) {
          const store = readStore();
          const changes = {};
          for (const [key, newValue] of Object.entries(items || {})) {
            changes[key] = { oldValue: store[key], newValue };
            store[key] = newValue;
          }
          writeStore(store);
          emitChanges(changes);
        },
        async remove(keys) {
          const store = readStore();
          const list = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          for (const key of list) {
            if (key == null || !(key in store)) continue;
            changes[key] = { oldValue: store[key], newValue: undefined };
            delete store[key];
          }
          writeStore(store);
          emitChanges(changes);
        },
        async clear() {
          const store = readStore();
          const changes = Object.keys(store).reduce((acc, key) => {
            acc[key] = { oldValue: store[key], newValue: undefined };
            return acc;
          }, {});
          writeStore({});
          emitChanges(changes);
        }
      },
      onChanged: {
        addListener(listener) {
          if (typeof listener === "function") listeners.add(listener);
        },
        removeListener(listener) {
          listeners.delete(listener);
        }
      }
    }
  };
  if (!globalThis.browser) globalThis.browser = globalThis.chrome;
  if (!globalThis.browser?.storage?.local) globalThis.browser = globalThis.chrome;
})();
