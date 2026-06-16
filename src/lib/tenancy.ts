const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function slugifyCompanyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function getTenantSubdomain(hostname: string) {
  const host = hostname.split(":")[0].toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN?.trim().toLowerCase();

  if (rootDomain && host.endsWith(`.${rootDomain}`)) {
    return host.slice(0, -(rootDomain.length + 1)).split(".")[0] || null;
  }

  if (host.endsWith(".localhost")) {
    return host.split(".")[0] || null;
  }

  if (LOCAL_HOSTS.has(host)) return null;

  const parts = host.split(".");
  if (parts.length <= 2) return null;
  const firstPart = parts[0];
  return firstPart === "www" ? null : firstPart;
}

export function getCurrentTenantSubdomain() {
  if (typeof window === "undefined") return null;
  return getTenantSubdomain(window.location.hostname);
}

