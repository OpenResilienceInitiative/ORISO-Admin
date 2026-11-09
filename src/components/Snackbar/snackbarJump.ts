import type { SnackbarJump, SnackbarJumpTarget } from './snackbarStore';

const FOCUSABLE =
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

/**
 * Take the person to the owner of an event: `onJump` first (open or enlarge the editor, expand the
 * tile), then one frame later, once React has rendered that, scroll the target to the middle of the
 * screen and focus it, or its first button, field or link.
 */
export const jumpTo = ({ target, onJump }: SnackbarJump) => {
    onJump?.();
    const run = () => {
        const element = resolveJumpTarget(target);
        if (!element) return;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        const focusable = element.matches(FOCUSABLE) ? element : element.querySelector<HTMLElement>(FOCUSABLE);
        if (focusable) {
            focusable.focus({ preventScroll: true });
            return;
        }
        if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
    else window.setTimeout(run, 0);
};
