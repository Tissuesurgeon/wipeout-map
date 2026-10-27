export const VERCEL_PROJECT = "wipeout-map";

const previewOrigin = new RegExp(`^https://${VERCEL_PROJECT}(-[a-z0-9-]+)?\\.vercel\\.app$`);

export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listed(origin: string): boolean {
  if (corsOrigins().includes(origin)) return true;
  return process.env.CORS_ALLOW_VERCEL_PREVIEWS === "1" && previewOrigin.test(origin);
}

export function sameHost(origin: string, host: string | undefined): boolean {
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** No Origin and the request host stay allowed. Other origins must be listed. */
export function originAllowed(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (sameHost(origin, host)) return true;
  return listed(origin);
}

export function originListed(origin: string | undefined): boolean {
  if (!origin) return false;
  return listed(origin);
}
