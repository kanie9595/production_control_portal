export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  // Prefer server-side env, but pass client-side build vars as fallback hints.
  const appId = import.meta.env.VITE_APP_ID;
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const params = new URLSearchParams();
  if (appId) params.set("appId", appId);
  if (oauthPortalUrl) params.set("oauthPortalUrl", oauthPortalUrl);
  const qs = params.toString();
  return qs ? `/api/oauth/login?${qs}` : "/api/oauth/login";
};
