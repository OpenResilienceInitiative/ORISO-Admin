export interface AppRuntimeConfig {
    API_URL?: string;
    KEYCLOAK_URL?: string;
    USER_SERVICE_ORIGIN?: string;
    AGENCY_SERVICE_ORIGIN?: string;
    TENANT_SERVICE_ORIGIN?: string;
    CONSULTING_TYPE_SERVICE_ORIGIN?: string;
    KEYCLOAK_ORIGIN?: string;
    APP_URL?: string;
    MATRIX_URL?: string;
    KEYCLOAK_REALM?: string;
    KEYCLOAK_CLIENT_ID?: string;
    USE_API_URL?: string;
    USE_HTTPS?: string;
    COOKIE_DOMAIN?: string;
    COOKIE_SECURE?: string;
    CSRF_WHITELIST_HEADER?: string;
    COOKIES_ALLOWEDLIST?: string;
}

declare global {
    interface Window {
        __APP_CONFIG__?: AppRuntimeConfig;
    }
}

export {};
