import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
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

    // jsdom does not implement scrolling; CardDeck calls scrollTo on its deck element.
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
}

// antd's static `message` / `notification` APIs render through a module-level
// singleton that portals notices into a container appended straight to document.body.
// RTL's cleanup() only unmounts what render() created, so a notice that has not
// auto-dismissed yet survives into the next test — a stale "This tenant ID is already
// taken." toast once broke an unrelated assertion in AccountInvitesTab.test.tsx on CI.
//
// destroy() alone does not fix it: it only queues a React update, so the notice is
// still in the DOM when the next test starts. act() flushes that update synchronously.
//
// Do NOT instead remove the .ant-message root from the body (the way stuck
// .ant-modal-root nodes are swept up): the singleton keeps rendering into the detached
// container, and every later notice in that file then silently never appears.
//
// Registered before the timer hook below so it runs last — Vitest runs afterEach in
// reverse registration order — and never has to flush against a test's fake clock.
//
// antd/react are imported lazily, only when a notice is actually on screen: a static
// import would pull antd into every test file, and an unconditional destroy() would
// instantiate the message holder in every single test.
afterEach(async () => {
    // `@vitest-environment node` files (e.g. api/fetchData.test.ts) have no DOM.
    if (typeof document === 'undefined' || !document.querySelector('.ant-message, .ant-notification')) {
        return;
    }

    const [{ message, notification }, { act }] = await Promise.all([import('antd'), import('react')]);

    act(() => {
        message.destroy();
        notification.destroy();
    });
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
