interface ImportMetaEnv {
    readonly VITE_PORT: number;
    readonly VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT: string;
    readonly VITE_API_URL: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_USER_SERVICE_ORIGIN?: string;
    readonly VITE_AGENCY_SERVICE_ORIGIN?: string;
    readonly VITE_TENANT_SERVICE_ORIGIN?: string;
    readonly VITE_CONSULTING_TYPE_SERVICE_ORIGIN?: string;
    readonly VITE_KEYCLOAK_ORIGIN?: string;
    readonly VITE_APP_URL: string;
    readonly VITE_MATRIX_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
    readonly VITE_USE_API_URL: 'true' | 'false';
    readonly VITE_USE_HTTPS: 'true' | 'false';
    readonly VITE_COOKIE_DOMAIN: string;
    readonly VITE_COOKIE_SECURE: 'true' | 'false';
    readonly VITE_HOSTNAMES_WITHOUT_COOKIE_DOMAIN: string;
    readonly VITE_COOKIES_ALLOWEDLIST: string;
    readonly REACT_APP_API_URL: string;
    readonly REACT_APP_KEYCLOAK_URL: string;
    readonly REACT_APP_USER_SERVICE_ORIGIN?: string;
    readonly REACT_APP_AGENCY_SERVICE_ORIGIN?: string;
    readonly REACT_APP_TENANT_SERVICE_ORIGIN?: string;
    readonly REACT_APP_CONSULTING_TYPE_SERVICE_ORIGIN?: string;
    readonly REACT_APP_KEYCLOAK_ORIGIN?: string;
    readonly REACT_APP_HOSTNAMES_WITHOUT_COOKIE_DOMAIN?: string;
    readonly REACT_APP_MATRIX_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
