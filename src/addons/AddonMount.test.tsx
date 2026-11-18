import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AddonMount } from './AddonMount';
import { ADDON_SHARED_GLOBAL, installAddonShared } from './addonShared';
import type { AddonHostProps, AddonModule, AvailableAddon } from './addonTypes';
import { loadAddonModule, resetAddonModulesForTests } from './loadAddonModule';

const i18nState = vi.hoisted(() => ({ language: 'de' }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { resolvedLanguage: i18nState.language, language: i18nState.language },
    }),
}));

const token = vi.hoisted(() => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
    return `${encode({ alg: 'none' })}.${encode({
        sub: 'admin-1',
        preferred_username: 'erika',
        realm_access: { roles: ['tenant-admin'] },
    })}.sig`;
});
vi.mock('../api/auth/auth', () => ({
    getAccessTokenForRequests: () => token,
    tryRefreshAccessToken: () => Promise.resolve(false),
}));

const addon: AvailableAddon = {
    name: 'demo',
    version: '0.1.0',
    entry: '/service/addons/demo/ui/entry.js',
    apiBase: '/service/addons/demo/api',
    apps: [{ id: 'editor', title: { de: 'Editor' }, slots: ['admin.page'] }],
};

const renderMount = (loader: (url: string) => Promise<AddonModule>, mountedAddon: AvailableAddon = addon) =>
    render(
        <MemoryRouter>
            <AddonMount
                addon={mountedAddon}
                app={mountedAddon.apps[0]}
                tenant={{ id: 7, name: 'Caritas' }}
                loader={loader}
                baseUrl="https://example.org"
            />
        </MemoryRouter>,
    );

beforeEach(() => {
    resetAddonModulesForTests();
    i18nState.language = 'de';
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AddonMount', () => {
    it('bootstraps once, mounts with the admin.page host props and unmounts on removal', async () => {
        const module: AddonModule = {
            bootstrap: vi.fn(),
            mount: vi.fn(({ domElement }: AddonHostProps) => {
                domElement.append('hello from the add-on');
            }),
            unmount: vi.fn(),
        };
        const loader = vi.fn(() => Promise.resolve(module));
        const view = renderMount(loader);

        expect(await screen.findByText('hello from the add-on')).toBeInTheDocument();
        expect(loader).toHaveBeenCalledWith('https://example.org/service/addons/demo/ui/entry.js?v=0.1.0');
        expect(module.bootstrap).toHaveBeenCalledTimes(1);
        const props = vi.mocked(module.mount).mock.calls[0][0];
        expect(props).toMatchObject({
            contract: 'oriso-addon/v1',
            slot: 'admin.page',
            addon: { name: 'demo', version: '0.1.0' },
            app: { id: 'editor' },
            user: { id: 'admin-1', username: 'erika', roles: ['tenant-admin'] },
            tenant: { id: 7, name: 'Caritas' },
            locale: 'de',
            informal: false,
        });
        expect(typeof props.api).toBe('function');
        expect(typeof props.navigate).toBe('function');

        view.unmount();
        await waitFor(() => expect(module.unmount).toHaveBeenCalledTimes(1));
    });

    it('passes the informal German form of address to the add-on', async () => {
        i18nState.language = 'de@informal';
        const module: AddonModule = { mount: vi.fn(), unmount: vi.fn() };
        renderMount(() => Promise.resolve(module));

        await waitFor(() => expect(module.mount).toHaveBeenCalledTimes(1));
        expect(vi.mocked(module.mount).mock.calls[0][0]).toMatchObject({ locale: 'de', informal: true });
    });

    it('runs a pending bootstrap only once for mounts that start meanwhile, and retries a failed one', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let finishBootstrap: () => void = () => {};
        const bootstrap = vi
            .fn()
            .mockImplementationOnce(() => Promise.reject(new Error('not yet')))
            .mockImplementationOnce(
                () =>
                    new Promise<void>((resolve) => {
                        finishBootstrap = resolve;
                    }),
            );
        const module: AddonModule = { bootstrap, mount: vi.fn(), unmount: vi.fn() };
        const loader = () => Promise.resolve(module);

        const failed = renderMount(loader);
        expect(await screen.findByText('addons.page.loadError')).toBeInTheDocument();
        failed.unmount();

        renderMount(loader);
        renderMount(loader);
        await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(2));
        expect(module.mount).not.toHaveBeenCalled();
        finishBootstrap();

        await waitFor(() => expect(module.mount).toHaveBeenCalledTimes(2));
        expect(bootstrap).toHaveBeenCalledTimes(2);
    });

    it('loads the new bundle after an upgrade that keeps the entry path', async () => {
        const oldModule: AddonModule = { mount: vi.fn(), unmount: vi.fn() };
        const newModule: AddonModule = { mount: vi.fn(), unmount: vi.fn() };
        const load = vi.fn((url: string) => Promise.resolve(url.endsWith('v=0.2.0') ? newModule : oldModule));
        const loader = (url: string) => loadAddonModule(url, load);

        const before = renderMount(loader);
        await waitFor(() => expect(oldModule.mount).toHaveBeenCalledTimes(1));
        before.unmount();

        renderMount(loader, { ...addon, version: '0.2.0' });
        await waitFor(() => expect(newModule.mount).toHaveBeenCalledTimes(1));
        expect(load).toHaveBeenLastCalledWith('https://example.org/service/addons/demo/ui/entry.js?v=0.2.0');
    });

    it('unmounts an app whose mount failed after it started', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const module: AddonModule = {
            mount: vi.fn(() => Promise.reject(new Error('half mounted'))),
            unmount: vi.fn(),
        };
        const view = renderMount(() => Promise.resolve(module));
        expect(await screen.findByText('addons.page.loadError')).toBeInTheDocument();

        view.unmount();
        await waitFor(() => expect(module.unmount).toHaveBeenCalledTimes(1));
    });

    it('shows an error instead of breaking the page when the bundle fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        renderMount(() => Promise.reject(new Error('offline')));
        expect(await screen.findByText('addons.page.loadError')).toBeInTheDocument();
    });
});

describe('loadAddonModule', () => {
    it('accepts a default export, caches per URL and forgets failures', async () => {
        const module = { mount: vi.fn(), unmount: vi.fn() };
        const load = vi.fn(() => Promise.resolve({ default: module }));
        await expect(loadAddonModule('/a.js', load)).resolves.toBe(module);
        await loadAddonModule('/a.js', load);
        expect(load).toHaveBeenCalledTimes(1);

        const broken = vi.fn(() => Promise.resolve({ mount: vi.fn() }));
        await expect(loadAddonModule('/b.js', broken)).rejects.toThrow('does not export mount and unmount');
        await expect(loadAddonModule('/b.js', broken)).rejects.toThrow();
        expect(broken).toHaveBeenCalledTimes(2);
    });
});

describe('installAddonShared', () => {
    it('publishes the host React once as a frozen object', () => {
        const target: Record<string, unknown> = {};
        installAddonShared(target);
        const shared = target[ADDON_SHARED_GLOBAL] as Record<string, unknown>;
        expect(shared.contract).toBe('oriso-addon/v1');
        expect(typeof (shared.react as { createElement: unknown }).createElement).toBe('function');
        expect(typeof (shared.reactDomClient as { createRoot: unknown }).createRoot).toBe('function');
        expect(typeof (shared.jsxRuntime as { jsx: unknown }).jsx).toBe('function');
        expect(Object.isFrozen(shared)).toBe(true);
    });
});
