import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Snackbar } from './Snackbar';
import { jumpTo } from './snackbarJump';
import { snackbarStore, type SnackbarAction, type SnackbarItem, type SnackbarStore } from './snackbarStore';
import styles from './SnackbarHost.module.scss';

export interface SnackbarHostProps {
    /** Defaults to the app-wide store. Stories and tests pass their own. */
    store?: SnackbarStore;
    /** Where to render. Defaults to `document.body`; Storybook docs pass a local frame. */
    container?: HTMLElement | null;
    /** Keep the host inside its container instead of the viewport (stories showing the stack in a frame). */
    contained?: boolean;
}

interface SlotProps {
    store: SnackbarStore;
    item: SnackbarItem;
    /** Place in the stack, oldest first. The newest is nearest the corner. */
    order: number;
}

/**
 * One visible pop-up and its timer. Success and info time out (4 to 6 s); everything else stays
 * until it is dismissed or acted on. The timer stops while the pointer is over the pop-up or focus
 * is inside it (WCAG 2.2.1), so an action never disappears under a keyboard user.
 */
const SnackbarSlot = ({ store, item, order }: SlotProps) => {
    const { t } = useTranslation();
    const [paused, setPaused] = useState(false);
    const remaining = useRef<number | null>(null);
    const startedAt = useRef(0);

    // A new or refreshed pop-up is a new object: it always starts with its full time.
    useEffect(() => {
        remaining.current = item.durationMs;
        setPaused(false);
    }, [item]);

    useEffect(() => {
        if (item.durationMs === null || paused || remaining.current === null) return undefined;
        startedAt.current = Date.now();
        const { key } = item;
        const timer = window.setTimeout(() => store.close('timeout', key), remaining.current);
        return () => {
            window.clearTimeout(timer);
            if (remaining.current !== null) {
                remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
            }
        };
    }, [item, paused, store]);

    const pause = useCallback(() => setPaused(true), []);
    const resume = useCallback(() => setPaused(false), []);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            store.close('dismiss', item.key);
        }
    };

    // The jump takes the place of the primary action when there is none, else of the second one.
    // Three actions do not fit a snackbar: the explicit ones win.
    const { jump } = item;
    const jumpAction: SnackbarAction | undefined = jump && {
        label: jump.label ?? t('snackbar.jump'),
        onClick: () => jumpTo(jump),
    };
    const action = item.action ?? jumpAction;
    const secondaryAction = item.action ? item.secondaryAction ?? jumpAction : item.secondaryAction;

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only forwards the pointer, focus and key events of the buttons inside
        <div
            className={styles.item}
            style={{ order }}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            onKeyDown={onKeyDown}
        >
            <Snackbar
                message={item.title}
                description={item.description}
                severity={item.severity}
                action={action}
                secondaryAction={secondaryAction}
                testId={item.testId}
                dismissible
                onClose={() => store.close('dismiss', item.key)}
                onActionDone={() => store.close('action', item.key)}
            />
        </div>
    );
};

/**
 * Renders the pop-ups the store says are visible. Mount once, near the root of the app.
 *
 * - A classic toast stack at the bottom right of the screen (phones: along the bottom), up to four
 *   at once, newest nearest the corner, with a gap. The rest wait in the store's queue.
 * - Two permanent live regions: `status` (polite) for everything, `alert` (assertive) for errors.
 *   They exist before a message arrives, which is what makes screen readers announce it.
 * - Every pop-up has a close button; Escape closes it when focus is inside. Focus is never moved
 *   to a pop-up.
 */
export const SnackbarHost = ({ store = snackbarStore, container, contained = false }: SnackbarHostProps) => {
    const { t } = useTranslation();
    const { visible } = useSyncExternalStore(store.subscribe, store.getState, store.getState);

    let target = container;
    if (target === undefined) target = typeof document === 'undefined' ? null : document.body;
    if (!target) return null;
    const slots = (errors: boolean) =>
        visible.map((item, order) =>
            (item.severity === 'error') === errors ? (
                <SnackbarSlot key={`${item.key}:${item.createdAt}`} store={store} item={item} order={order} />
            ) : null,
        );
    return createPortal(
        <div
            className={`${styles.host} ${contained ? styles.contained : ''}`}
            data-testid="snackbar-host"
            role="region"
            aria-label={t('snackbar.region')}
        >
            <div role="status" aria-live="polite" aria-atomic="false" className={styles.region}>
                {slots(false)}
            </div>
            <div role="alert" aria-atomic="false" className={styles.region}>
                {slots(true)}
            </div>
        </div>,
        target,
    );
};

export default SnackbarHost;
