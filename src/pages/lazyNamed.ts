import { ComponentType, lazy } from 'react';

/**
 * Guard flag so a chunk that is genuinely broken (rather than merely stale) cannot put the app into
 * a reload loop. Cleared again as soon as any lazy chunk loads successfully.
 */
export const CHUNK_RELOAD_FLAG = 'oriso-admin:chunk-reloaded';

const CHUNK_ERROR_PATTERNS = [
    // Chrome / Vite
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    // Safari
    'importing a module script failed',
    // Firefox
    'error resolving module specifier',
    // webpack-style, still emitted by some bundler plugins
    'loading chunk',
];

/**
 * A hashed chunk that 404s means the deployed build was replaced while this tab was open: the
 * `index.html` in memory still points at asset names that no longer exist on the server. Reloading
 * picks up the new `index.html`. A real error *inside* the module must not trigger that.
 */
export const isChunkLoadError = (error: unknown): boolean => {
    if (!error) return false;
    if (typeof error === 'object' && (error as { name?: string }).name === 'ChunkLoadError') return true;

    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

// sessionStorage throws in Safari private mode and is absent in non-browser test environments.
const readFlag = (): boolean => {
    try {
        return window.sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1';
    } catch {
        return true; // no storage means no loop protection — do not reload at all
    }
};

const writeFlag = (value: boolean): void => {
    try {
        if (value) {
            window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
        } else {
            window.sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
        }
    } catch {
        // storage unavailable — the flag is best-effort
    }
};

/**
 * Loads a lazy route chunk, surviving the two ways the import can fail:
 *
 * 1. transient network blip → one retry;
 * 2. stale `index.html` after a redeploy → one full reload, guarded against looping.
 *
 * Without this, any deploy turns every not-yet-loaded route into the app-level ErrorBoundary
 * ("Etwas ist schiefgelaufen") for every user who had a tab open.
 */
export const loadChunk = async <TModule>(factory: () => Promise<TModule>): Promise<TModule> => {
    try {
        const module = await factory();
        writeFlag(false);
        return module;
    } catch (firstError) {
        try {
            const module = await factory();
            writeFlag(false);
            return module;
        } catch (retryError) {
            if (isChunkLoadError(retryError) && !readFlag()) {
                writeFlag(true);
                window.location.reload();
                // Never settles: the page is going away, and resolving here would flash the
                // ErrorBoundary in the moment before the reload takes effect.
                return new Promise<TModule>(() => {});
            }
            throw retryError;
        }
    }
};

export const lazyNamed = <TModule extends Record<string, ComponentType<any>>>(
    factory: () => Promise<TModule>,
    exportName: keyof TModule,
) => lazy(() => loadChunk(factory).then((module) => ({ default: module[exportName] })));
