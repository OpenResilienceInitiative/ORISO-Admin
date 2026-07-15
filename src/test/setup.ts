import '@testing-library/jest-dom';

// jsdom throws "Not implemented" for the two-argument getComputedStyle(el, pseudoElt)
// form (it can't resolve pseudo-elements). antd's Modal scroll-locker
// (@rc-component/portal -> rc-util/getScrollBarSize) calls this on every Modal
// mount to measure a ::-webkit-scrollbar, which spams every test that opens a
// Modal with a jsdom error log and does real (if usually harmless) extra work
// in the mount effect. Fall back to the one-argument form, which jsdom
// supports, since pseudo-element styles aren't meaningfully computable here anyway.
if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const nativeGetComputedStyle = window.getComputedStyle.bind(window);
    // Always call jsdom's implementation with a single argument - passing a
    // (truthy) second argument is exactly what makes jsdom throw.
    window.getComputedStyle = ((elt: Element) => nativeGetComputedStyle(elt)) as typeof window.getComputedStyle;
}
