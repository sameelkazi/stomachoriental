import { getBackendUrl, getTenantSlug } from "./api";

const backendUrl = () => getBackendUrl();

export const toAbsoluteAssetUrl = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/uploads/")) return `${backendUrl()}${value}`;
  return value;
};

export const withCacheBust = (url: string, version?: string | number) => {
  if (!url || url.startsWith("data:")) return url;
  const token = version ? String(version) : String(Date.now());
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(token)}`;
};

export const applyTenantBranding = (config: any, slug = getTenantSlug()) => {
  if (!config) return;

  const brandingVersion =
    config.updatedAt ||
    config.brandingVersion ||
    [config.faviconUrl, config.logoUrl, config.seoMeta?.ogImageUrl].filter(Boolean).join("|");

  const setMetaTag = (selector: string, attr: "name" | "property", key: string, content?: string) => {
    if (!content) return;
    let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  const seoMeta = config.seoMeta || {};
  const title =
    seoMeta.title ||
    (config.name || config.restaurantName
      ? `${config.name || config.restaurantName} | Authentic Fine Dining & Ordering`
      : "");
  if (title) {
    document.title = title;
  }

  const description = seoMeta.description || config.description;
  const ogImageUrl =
    withCacheBust(
      toAbsoluteAssetUrl(seoMeta.ogImageUrl || config.faviconUrl || config.logoUrl) || "/logo.svg",
      brandingVersion
    );

  setMetaTag('meta[name="description"]', "name", "description", description);
  setMetaTag('meta[name="keywords"]', "name", "keywords", seoMeta.keywords);
  setMetaTag('meta[property="og:title"]', "property", "og:title", title);
  setMetaTag('meta[property="og:description"]', "property", "og:description", description);
  setMetaTag('meta[property="og:image"]', "property", "og:image", ogImageUrl);
  setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
  setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImageUrl);

  const faviconUrl = withCacheBust(
    toAbsoluteAssetUrl(config.faviconUrl || config.logoUrl) || "/logo.svg",
    brandingVersion
  );

  const iconLinks = document.querySelectorAll("link[rel*='icon']");
  if (iconLinks.length > 0) {
    iconLinks.forEach((link) => {
      (link as HTMLLinkElement).href = faviconUrl;
    });
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    newLink.href = faviconUrl;
    document.head.appendChild(newLink);
  }

  const theme = config.theme;
  if (theme) {
    document.documentElement.style.setProperty("--color-primary-container", theme.primaryColor || "#d31212");
    if (slug === "pizza-roma" || theme.primaryColor === "#2F855A") {
      document.documentElement.style.setProperty("--color-primary", "#E8F5E9");
    } else {
      document.documentElement.style.setProperty("--color-primary", "#ffb4a9");
    }
    document.documentElement.style.setProperty("--color-accent", theme.accentColor || "#ED8936");
  }
};

export const fetchTenantBrandingConfig = async (slug = getTenantSlug()) => {
  const response = await fetch(`${backendUrl()}/api/restaurant/config`, {
    headers: { "x-tenant-slug": slug },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!payload.success) return null;
  return payload.data;
};

export const bootstrapTenantBranding = async (slug = getTenantSlug()) => {
  try {
    const config = await fetchTenantBrandingConfig(slug);
    if (config) {
      applyTenantBranding(config, slug);
    }
    return config;
  } catch {
    return null;
  }
};
