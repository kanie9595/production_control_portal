export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  // Build OAuth redirect URL on the server where environment values are stable
  // across deployments, then redirect from client.
  return "/api/oauth/login";
};
