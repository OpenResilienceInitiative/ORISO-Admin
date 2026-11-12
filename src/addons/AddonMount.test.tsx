import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AddonMount } from './AddonMount';
import { ADDON_SHARED_GLOBAL, installAddonShared } from './addonShared';
import type { AddonHostProps, AddonModule, AvailableAddon } from './addonTypes';
import { loadAddonModule, resetAddonModulesForTests } from './loadAddonModule';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de', language: 'de' } }),
}));

const token = vi.hoisted(() => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
    return `${encode({ alg: 'none' })}.${encode({
        sub: 'admin-1',
        preferred_username: 'erika',
        realm_access: { roles: ['tenant-admin'] },
    })}.sig`;
});
vi.mock('../api/auth/auth', () => ({ getAccessTokenForRequests: () => token }));

const addon: AvailableAddon = {
    name: 'demo',
    version: '0.1.0',
    entry: '/service/addons/demo/ui/entry.js',
    apiBase: '/service/addons/demo/api',
    apps: [{ id: 'editor', title: { de: 'Editor' }, slots: ['admin.page'] }],
};

const renderMount = (loader: (url: string) => Promise<AddonModule>) =>
    render(
        <MemoryRouter>
            <AddonMount
                addon={addon}
                app={addon.apps[0]}
                tenant={{ id: 7, name: 'Caritas' }}
                loader={loader}
                baseUrl="https://example.org"
            />
        </MemoryRouter>,
    );

beforeEach(() => {
    resetAddonModulesForTests();
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
        expect(loader).toHaveBeenCalledWith('https://example.org/service/addons/demo/ui/entry.js');
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
