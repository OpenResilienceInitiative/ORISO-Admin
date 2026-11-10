import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vite-plus/test';
import { snackbarStore } from '../components/Snackbar/snackbarStore';
import { installMemoryStorage, resetMemoryStorage } from './memoryStorage';

if (typeof window !== 'undefined') {
    // jsdom does not implement matchMedia; antd responsive hooks need it.
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    installMemoryStorage();

    // jsdom does not implement scrolling.
    if (!Element.prototype.scrollTo) {
        Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
    }

    // antd/rc-util call getComputedStyle with a pseudo-element to measure scrollbars.
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    window.getComputedStyle = ((element: Element, pseudoElt?: string | null) => {
        if (pseudoElt) {
            return {
                getPropertyValue: () => '',
                width: '0px',
                height: '0px',
            } as unknown as CSSStyleDeclaration;
        }

        return originalGetComputedStyle(element);
    }) as typeof window.getComputedStyle;

    // Emotion's dev build gives every rule its own <style> tag, and antd rescans all of <head>
    // on every component mount; one tag per sheet (as in production) keeps big forms in budget.
    const [emotion, { createElement }, { flushSync }, { createRoot }] = await Promise.all([
        import('@emotion/react'),
        import('react'),
        import('react-dom'),
        import('react-dom/client'),
    ]);
    const found: { cache?: ReturnType<typeof emotion.__unsafe_useEmotionCache> } = {};
    const EmotionCacheProbe = () => {
        // eslint-disable-next-line no-underscore-dangle -- emotion's only public handle on its default cache
        found.cache = emotion.__unsafe_useEmotionCache();
        return null;
    };
    const probeRoot = createRoot(document.createElement('div'));
    flushSync(() => probeRoot.render(createElement(EmotionCacheProbe)));
    probeRoot.unmount();
    if (found.cache) {
        found.cache.sheet.isSpeedy = true;
    }
}

// The snackbar channel is a module-level store, so a snackbar raised by one test would still be
// queued (and its dedupe window still open) in the next one. Clearing it also forgets the dedupe
// history, which keeps tests that raise the same message independent of each other.
afterEach(() => {
    snackbarStore.clear();
});

// Prevent storage leaking from one test into the next: the in-memory areas live for
// the whole file, so without this a key written by one test is still there for the next.
afterEach(() => {
    resetMemoryStorage();
});

// Prevent fake-timer leakage between test files when a test forgets to restore.
afterEach(() => {
    vi.useRealTimers();
});

// Notifications are pop-ups on the shared snackbar channel (`<Notify>`, `snackbar.*`), rendered by the
// app-level `<SnackbarHost>`. A DOM test gets that host the moment something is notified, so a component
// that raises a notification can be asserted with `screen`/`findByText`/`findByRole('alert')` as in the
// app. Mounting on demand (not in beforeEach) lets a test finish its own `react-i18next` mock first.
let teardownSnackbarHost: (() => void) | undefined;

beforeEach(async () => {
    if (typeof document === 'undefined') return;
    const [{ createElement, act }, { createRoot }, { SnackbarHost, snackbar }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Snackbar'),
    ]);
    snackbar.clear();
    let mounted: { root: ReturnType<typeof createRoot>; element: HTMLElement } | undefined;
    const mount = () => {
        if (mounted) return;
        // A test that renders its own <SnackbarHost> already shows the pop-ups; a second host would duplicate them.
        if (document.querySelector('[data-testid="snackbar-host"]')) return;
        const element = document.createElement('div');
        document.body.appendChild(element);
        const root = createRoot(element);
        mounted = { root, element };
        // Not wrapped in act(): the first notification often arrives while React is already rendering.
        root.render(createElement(SnackbarHost));
    };
    const unsubscribe = snackbarStore.subscribe(() => {
        if (snackbarStore.getState().current) mount();
    });
    teardownSnackbarHost = () => {
        unsubscribe();
        act(() => snackbar.clear());
        if (mounted) {
            act(() => mounted?.root.unmount());
            mounted.element.remove();
        }
    };
});

afterEach(() => {
    teardownSnackbarHost?.();
    teardownSnackbarHost = undefined;
});
