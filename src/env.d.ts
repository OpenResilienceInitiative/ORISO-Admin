interface ImportMetaEnv {
    readonly VITE_PORT: number;
    readonly VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT: string;
    readonly VITE_API_URL: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_APP_URL: string;
    readonly VITE_MATRIX_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
    readonly VITE_USE_API_URL: 'true' | 'false';
    readonly VITE_USE_HTTPS: 'true' | 'false';
    readonly VITE_COOKIE_DOMAIN: string;
    readonly VITE_COOKIE_SECURE: 'true' | 'false';
    readonly VITE_COOKIES_ALLOWEDLIST: string;
    readonly VITE_APPOINTMENT_SERVICE_URL: string;
    readonly REACT_APP_API_URL: string;
    readonly REACT_APP_KEYCLOAK_URL: string;
    readonly REACT_APP_MATRIX_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
