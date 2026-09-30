// Set and read only by the auth BFF (scripts/auth-bff-handlers.mjs), httpOnly on /admin.
export const AUTH_ACCESS_TOKEN_COOKIE = 'oriso_admin_access_token';
export const AUTH_REFRESH_TOKEN_COOKIE = 'oriso_admin_refresh_token';

// The counselling app's session on the same host (Path=/, readable by script). The Admin sees
// these in document.cookie but must never overwrite or delete them.
const APP_SESSION_COOKIES = ['keycloak', 'refreshToken'];

export const isAuthTokenCookie = (name: string): boolean =>
    name === AUTH_ACCESS_TOKEN_COOKIE || name === AUTH_REFRESH_TOKEN_COOKIE || APP_SESSION_COOKIES.includes(name);
