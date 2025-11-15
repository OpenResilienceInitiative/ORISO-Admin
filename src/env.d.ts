interface ImportMetaEnv {
    readonly VITE_PORT: number;
    readonly VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT: string;
    readonly VITE_API_URL: string;
    readonly VITE_USE_API_URL: ?('true' | 'false');
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
