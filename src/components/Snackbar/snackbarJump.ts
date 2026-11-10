import type { SnackbarJump, SnackbarJumpTarget } from './snackbarStore';

const FIELD = 'input, select, textarea, button, a[href], [contenteditable="true"], [role="textbox"]';
const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"], [data-jump-heading]';
/** Gap kept free above a tile that was scrolled to the top, on top of a fixed or sticky page header. */
const TOP_GAP_PX = 16;

/** An id first, then any CSS selector; an element or a ref as it is. */
export const resolveJumpTarget = (target: SnackbarJumpTarget): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    if (typeof target === 'string') {
        const byId = document.getElementById(target);
        if (byId) return byId;
        try {
            return document.querySelector<HTMLElement>(target);
        } catch {
            return null;
        }
    }
    return 'current' in target ? target.current : target;
};

/** A browser lays things out; jsdom (unit tests) does not, so every box there is empty. */
const hasLayout = () => document.documentElement.getBoundingClientRect().height > 0;

const isEmpty = (element: HTMLElement) => {
    const { width, height } = element.getBoundingClientRect();
    return width <= 0 || height <= 0;
};

const isPageLevel = (element: HTMLElement) =>
    element === document.body ||
    element === document.documentElement ||
    element.id === 'root' ||
    element.id === 'storybook-root' ||
    element.tagName === 'MAIN';

/**
 * The element a person can actually see for this target: an empty wrapper (a hidden marker's parent, a
 * zero-height div) hands over to its nearest ancestor with a size. A page-sized owner hands over to its
 * first heading, so "view" never lands on "the whole page".
 */
export const nearestVisible = (target: HTMLElement): HTMLElement => {
    if (!hasLayout()) return target;
    let element: HTMLElement = target;
    while (isEmpty(element) && element.parentElement && !isPageLevel(element)) element = element.parentElement;
    const tallerThanScreen = element.getBoundingClientRect().height > window.innerHeight * 1.5;
    if (isPageLevel(element) || tallerThanScreen) {
        const heading = element.querySelector<HTMLElement>(HEADING);
        if (heading && !isEmpty(heading)) return heading;
    }
    return element;
};

/** Height of a fixed or sticky page header, so a tile scrolled to the top is not hidden under it. */
const headerOffset = (): number => {
    const header = document.querySelector<HTMLElement>('header, [role="banner"]');
    if (!header) return TOP_GAP_PX;
    const { position } = window.getComputedStyle(header);
    if (position !== 'fixed' && position !== 'sticky') return TOP_GAP_PX;
    return Math.round(header.getBoundingClientRect().height) + TOP_GAP_PX;
};

const pendingMargin = new WeakMap<HTMLElement, { original: string; timer: number }>();

const focusQuietly = (element: HTMLElement) => {
    if (!element.matches(FIELD) && !element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
};

/**
 * Take the person to the owner of an event: `onJump` first (open or enlarge the editor, expand the
 * tile), then one frame later, once React has rendered that:
 * - a field or button is scrolled to the middle of the screen and focused;
 * - a tile is scrolled with its top just below the page header and its heading is focused (the tile
 *   itself when it has none), so the screen reader announces where the person is.
 * The pop-up is left alone: an error that is still true must not disappear by looking at it.
 */
export const jumpTo = ({ target, onJump }: SnackbarJump) => {
    onJump?.();
    const run = () => {
        const resolved = resolveJumpTarget(target);
        if (!resolved) return;
        const element = nearestVisible(resolved);
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const behavior = reduceMotion ? 'auto' : 'smooth';
        if (element.matches(FIELD)) {
            element.scrollIntoView?.({ block: 'center', behavior });
            focusQuietly(element);
            return;
        }
        const heading = element.matches(HEADING) ? element : element.querySelector<HTMLElement>(HEADING);
        const anchor = heading && (!hasLayout() || !isEmpty(heading)) ? heading : element;
        // The tile's top, not its heading, goes to the top: the whole tile is then in view.
        const scrolled = element;
        // A second jump within the second must restore the value from before the first one, not the temporary offset.
        const pending = pendingMargin.get(scrolled);
        if (pending) window.clearTimeout(pending.timer);
        const original = pending ? pending.original : scrolled.style.scrollMarginTop;
        scrolled.style.scrollMarginTop = `${headerOffset()}px`;
        scrolled.scrollIntoView?.({ block: 'start', behavior });
        pendingMargin.set(scrolled, {
            original,
            timer: window.setTimeout(() => {
                scrolled.style.scrollMarginTop = original;
                pendingMargin.delete(scrolled);
            }, 1000),
        });
        focusQuietly(anchor);
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
};
