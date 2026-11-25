import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AdminDisplayProvider, useAdminDisplay } from './AdminDisplayContext';

const scopeA = JSON.stringify(['https://example.test/realm', 'account-a', 'login-one']);
const scopeB = JSON.stringify(['https://example.test/realm', 'account-b', 'login-one']);
const scopeNewLogin = JSON.stringify(['https://example.test/realm', 'account-a', 'login-two']);

const PreferencesProbe = () => {
    const display = useAdminDisplay();
    if (!display) return null;

    return (
        <>
            <output aria-label="choices">
                {[display.schemeChoice, display.contrast, display.textScale].join(' ')}
            </output>
            <button
                type="button"
                onClick={() => {
                    display.setSchemeChoice('dark');
                    display.setContrast('high');
                    display.setTextScale(2);
                }}
            >
                Set choices
            </button>
        </>
    );
};

const mount = (sessionScope: string | null = scopeA) =>
    render(
        <AdminDisplayProvider sessionScope={sessionScope}>
            <PreferencesProbe />
        </AdminDisplayProvider>,
    );

const choices = () => screen.getByLabelText('choices');
const update = () => fireEvent.click(screen.getByRole('button', { name: 'Set choices' }));
const defaults = 'system standard 1';
const chosen = 'dark high 2';

describe('Admin display preferences for the current login', () => {
    beforeEach(() => window.sessionStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('restores all three choices on remount in the same login session', () => {
        const initial = mount();
        expect(choices()).toHaveTextContent(defaults);
        update();
        expect(choices()).toHaveTextContent(chosen);
        initial.unmount();

        mount();
        expect(choices()).toHaveTextContent(chosen);
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--admin-personal-text-scale')).toBe('2');
        expect(root.dataset.adminPersonalContrast).toBe('high');
    });

    it.each([
        ['another account', scopeB],
        ['a new login', scopeNewLogin],
    ])('uses defaults for %s even when old session storage exists', (_name, sessionScope) => {
        const initial = mount();
        update();
        expect(choices()).toHaveTextContent(chosen);
        initial.unmount();

        mount(sessionScope);
        expect(choices()).toHaveTextContent(defaults);
    });

    it('keeps in-memory controls usable when there is no accepted scope', () => {
        const view = mount(null);
        update();
        expect(choices()).toHaveTextContent(chosen);
        expect(window.sessionStorage.length).toBe(0);
        view.unmount();

        mount(null);
        expect(choices()).toHaveTextContent(defaults);
    });

    it('falls back to defaults when the record is damaged', () => {
        const first = mount();
        update();
        first.unmount();

        const key = window.sessionStorage.key(0);
        if (!key) throw new Error('The accepted scope did not write a record');
        window.sessionStorage.setItem(key, 'invalid JSON');

        mount();
        expect(choices()).toHaveTextContent(defaults);
    });

    it('uses defaults and allows updates when storage access is denied', () => {
        vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
            throw new DOMException('Storage disabled', 'SecurityError');
        });

        mount();
        expect(choices()).toHaveTextContent(defaults);
        update();
        expect(choices()).toHaveTextContent(chosen);
    });
});
