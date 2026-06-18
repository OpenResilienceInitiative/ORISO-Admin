export const AUTH_ACCESS_TOKEN_COOKIE = 'keycloak';
export const AUTH_REFRESH_TOKEN_COOKIE = 'refreshToken';

export const isAuthTokenCookie = (name: string): boolean =>
    name === AUTH_ACCESS_TOKEN_COOKIE || name === AUTH_REFRESH_TOKEN_COOKIE;
