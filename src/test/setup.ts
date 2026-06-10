/**
 * Component-test setup (jsdom): antd needs matchMedia and
 * ResizeObserver, which jsdom does not provide.
 */
import '@testing-library/jest-dom/vitest';

// Node-environment test files share this setup; only patch the DOM when
// the file runs under jsdom (// @vitest-environment jsdom docblock).
const hasDom = typeof window !== 'undefined';

if (hasDom && !window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
}

if (hasDom && !window.ResizeObserver) {
    window.ResizeObserver = class {
        observe() {}

        unobserve() {}

        disconnect() {}
    } as unknown as typeof ResizeObserver;
}

// jsdom has no canvas; react-color touches it for saturation rendering.
if (hasDom && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = () => null;
}
