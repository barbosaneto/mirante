export function createAuthenticationProviderUrl({
  baseUrl,
  loginPath,
  returnUrl,
}: {
  baseUrl: string;
  loginPath: string;
  returnUrl: string;
}): string {
  if (
    !loginPath.startsWith("/") ||
    loginPath.startsWith("//") ||
    loginPath.includes("\\")
  ) {
    throw new Error("Authentication providers must use a same-origin path.");
  }

  const url = new URL(loginPath, baseUrl);
  url.searchParams.set("next", returnUrl);
  return url.toString();
}
