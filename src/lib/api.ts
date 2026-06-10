export const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  const { hostname, protocol } = window.location;
  if (hostname.includes("vercel.app") || hostname.includes("stomachoriental.com")) {
    return window.location.origin;
  }
  return `${protocol}//${hostname}:5000`;
};

export const getTenantSlug = (override?: string) => {
  if (override) return override;
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant") || import.meta.env.VITE_TENANT_SLUG || "stomach-oriental";
};

export const getTenantStorageKey = (key: string, tenantSlug = getTenantSlug()) => `${tenantSlug}:${key}`;

export const tenantStorage = {
  getItem: (key: string) => localStorage.getItem(getTenantStorageKey(key)),
  setItem: (key: string, value: string) => localStorage.setItem(getTenantStorageKey(key), value),
  removeItem: (key: string) => localStorage.removeItem(getTenantStorageKey(key)),
};

export const getAdminToken = () => {
  const scoped = tenantStorage.getItem("admin_token");
  if (scoped) return scoped;
  const legacy = localStorage.getItem("admin_token");
  if (legacy) {
    tenantStorage.setItem("admin_token", legacy);
    localStorage.removeItem("admin_token");
    return legacy;
  }
  return null;
};

export const setAdminToken = (token: string) => {
  tenantStorage.setItem("admin_token", token);
  localStorage.removeItem("admin_token");
};

export const removeAdminToken = () => {
  tenantStorage.removeItem("admin_token");
  localStorage.removeItem("admin_token");
};

