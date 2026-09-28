export const STUUDIUM_ORIGINS = ["https://torg.ope.ee"] as const;

export const STUUDIUM_MATCHES = STUUDIUM_ORIGINS.map((origin) => `${origin}/*`);
export const STUUDIUM_AUTH_MATCHES = STUUDIUM_ORIGINS.map((origin) => `${origin}/auth*`);

type DocumentRootMetadata = Pick<Element, "getAttribute">;

export function isSupportedStuudiumUrl(value: string | URL): boolean {
  try {
    const url = value instanceof URL ? value : new URL(value);
    return (STUUDIUM_ORIGINS as readonly string[]).includes(url.origin);
  } catch {
    return false;
  }
}

export function isSignedOutStuudiumAuthenticationDocument(
  root: DocumentRootMetadata,
  value: string | URL,
): boolean {
  if (root.getAttribute("data-track-url") === "/auth") return true;

  try {
    const url = value instanceof URL ? value : new URL(value);
    return isSupportedStuudiumUrl(url) && url.pathname.startsWith("/auth");
  } catch {
    return false;
  }
}
