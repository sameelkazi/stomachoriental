const isBrowser = typeof window !== "undefined";

const stripTrailingSlash = (url: string) => url.replace(/\/$/, "");

const normalizeHost = (host: string) => host.replace(/^www\./, "").toLowerCase();

const getConfiguredCustomDomain = () => {
  const raw = import.meta.env.VITE_CUSTOM_DOMAIN || "";
  return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
};

/**
 * Prefer same-origin on deployed frontends so Vercel/nginx rewrites proxy /api and /socket.io
 * without cross-origin CORS failures.
 */
export const getBackendUrl = () => {
  if (!isBrowser) {
    return stripTrailingSlash(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");
  }

  const { hostname, protocol, origin } = window.location;
  const customDomain = getConfiguredCustomDomain();
  const onVercel = hostname.includes("vercel.app");
  const onCustomDomain = Boolean(customDomain && normalizeHost(hostname) === customDomain);

  if (onVercel || onCustomDomain) {
    return origin;
  }

  if (import.meta.env.VITE_BACKEND_URL) {
    return stripTrailingSlash(import.meta.env.VITE_BACKEND_URL);
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:5000`;
  }

  return origin;
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
