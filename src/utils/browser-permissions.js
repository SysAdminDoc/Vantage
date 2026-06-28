export function supportsBrowserPermissions() {
  const ext = extensionApi();
  return !!ext?.permissions?.request;
}

export async function hasBrowserPermission(permission) {
  const ext = extensionApi();
  if (!permission) return true;
  if (!ext?.permissions?.contains) return false;
  return callPermission(ext, "contains", { permissions: [permission] });
}

export async function requestBrowserPermission(permission) {
  const ext = extensionApi();
  if (!permission) return { granted: true, unsupported: false };
  if (!ext?.permissions?.request) {
    return { granted: false, unsupported: true };
  }
  const granted = await callPermission(ext, "request", { permissions: [permission] });
  return { granted, unsupported: false };
}

export async function removeBrowserPermission(permission) {
  const ext = extensionApi();
  if (!permission || !ext?.permissions?.remove) return false;
  return callPermission(ext, "remove", { permissions: [permission] });
}

export function onBrowserPermissionsRemoved(callback) {
  const ext = extensionApi();
  const event = ext?.permissions?.onRemoved;
  if (!event?.addListener || typeof callback !== "function") return () => {};
  const handler = (permissions) => {
    const removed = Array.isArray(permissions?.permissions) ? permissions.permissions : [];
    if (removed.length) callback(removed);
  };
  event.addListener(handler);
  return () => event.removeListener?.(handler);
}

function extensionApi() {
  return globalThis.browser || globalThis.chrome || {};
}

function usesPromisePermissions(ext) {
  return !!globalThis.browser?.permissions && ext?.permissions === globalThis.browser.permissions;
}

function callPermission(ext, methodName, payload) {
  const fn = ext?.permissions?.[methodName];
  if (typeof fn !== "function") return Promise.resolve(false);
  if (usesPromisePermissions(ext)) {
    return Promise.resolve(fn.call(ext.permissions, payload)).then(Boolean, () => false);
  }
  return new Promise((resolve) => {
    try {
      fn.call(ext.permissions, payload, (value) => {
        if (ext.runtime?.lastError) resolve(false);
        else resolve(!!value);
      });
    } catch {
      resolve(false);
    }
  });
}
