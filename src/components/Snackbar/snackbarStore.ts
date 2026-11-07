import { isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Central channel for every event notification of the Admin: a pop-up, never a box in the page.
 *
 * The store is framework-free on purpose: the API layer (`fetchData`), hooks and components all
 * raise messages through the same module-level `snackbar` object, whether or not a React tree is
 * mounted yet. `<SnackbarHost>` renders whatever the store says is visible.
 *
 * Rules the store enforces:
 * - A classic toast stack: up to four pop-ups are visible at once, the newest nearest the corner.
 *   The rest queue and move up as pop-ups go.
 * - Every pop-up has a title and a close control.
 * - Errors, warnings and anything with an action stay until dismissed or acted on. Only success
 *   and info may time out (4 to 6 s).
 * - An identical message never shows twice, and one `causeKey` (one outage behind six failing
 *   cards) never shows twice.
 */

export type SnackbarSeverity = 'info' | 'success' | 'warning' | 'error';

export interface SnackbarAction {
    /** Already translated, e.g. `t('snackbar.retry')`. */
    label: string;
    onClick: () => void;
}

/** What a jump action scrolls to: an element id, a CSS selector, an element or a ref to one. */
export type SnackbarJumpTarget = string | HTMLElement | { current: HTMLElement | null };

/**
 * The "Ansehen" action of a pop-up whose event belongs to a tile or a field. Click: `onJump` runs
 * first (open or enlarge the editor, expand the tile), then the page scrolls to the target and
 * focuses it (or its first button, field or link). The pop-up is dismissed afterwards: the person
 * has been taken to the owner, the pop-up did its job.
 */
export interface SnackbarJump {
    target: SnackbarJumpTarget;
    /** Already translated. Default: "Ansehen" / "View". */
    label?: string;
    onJump?: () => void;
}

interface SnackbarOptionsBase {
    /** The text under the title: one or two sentences about what happened or what to do. */
    description?: ReactNode;
    severity?: SnackbarSeverity;
    /** The text action (Figma "Action" / "Longer Action"). A pop-up with an action never times out. */
    action?: SnackbarAction;
    /** A second text action next to `action`, for a choice between two outcomes (e.g. two drafts). */
    secondaryAction?: SnackbarAction;
    /** Takes the person to the tile or field the event belongs to. Counts as an action: it stays. */
    jump?: SnackbarJump | SnackbarJumpTarget;
    /** Accepted for older call sites; every pop-up is closable, so it changes nothing. */
    dismissible?: boolean;
    /** Stays until closed even when it is a success or info. Errors and warnings always do. */
    persistent?: boolean;
    /** Visible time in ms, success and info only (4 to 6 s). Ignored for everything that stays. */
    durationMs?: number;
    /** Identity. Same key = same pop-up (the newer text replaces the older). Default: severity + text. */
    key?: string;
    /**
     * Identity of the cause. One backend outage that fails six cards must show one pop-up: give all
     * six the same `causeKey` (any text) and only the first one shows.
     */
    causeKey?: string;
    /** `data-testid` of the rendered pop-up, so tests can address a specific notification. Default `snackbar`. */
    testId?: string;
    /** Called once when the pop-up is gone, whatever the reason. */
    onClose?: (reason: SnackbarCloseReason) => void;
}

/**
 * Every pop-up needs a title: what it is about, in a few words (already translated, never a raw
 * server string). `message` is the same thing under its old name; one of the two is required.
 */
export type SnackbarOptions = SnackbarOptionsBase &
    ({ title: ReactNode; message?: ReactNode } | { message: ReactNode; title?: ReactNode });

export type SnackbarCloseReason = 'timeout' | 'dismiss' | 'action' | 'replaced';

export interface SnackbarItem extends Omit<SnackbarOptionsBase, 'key' | 'durationMs' | 'persistent' | 'jump'> {
    key: string;
    /** The title. */
    title: ReactNode;
    /** Same as `title` (the old name, still read by existing call sites and tests). */
    message: ReactNode;
    severity: SnackbarSeverity;
    jump?: SnackbarJump;
    /** `null` = stays until dismissed or acted on. */
    durationMs: number | null;
    createdAt: number;
}

/** Same text (or same cause) within this window collapses into the pop-up that is already there. */
export const SNACKBAR_DEDUPE_WINDOW_MS = 4000;
/** Pop-ups on screen at once; the rest wait in the queue. */
export const SNACKBAR_MAX_VISIBLE = 4;
const MAX_QUEUE = 10;

/** Success and info are the only ones that time out. */
export const SNACKBAR_MIN_DURATION_MS = 4000;
export const SNACKBAR_MAX_DURATION_MS = 6000;

/** The words a node shows: strings and numbers as they are, elements and arrays through their children. */
const plainText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(plainText).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
    return '';
};

const textLength = (node: ReactNode): number => plainText(node).length;

const titleOf = (options: SnackbarOptions): ReactNode => options.title ?? options.message ?? options.description;

/**
 * Only success and info may time out, 4 to 6 seconds (a little longer for long text). Errors,
 * warnings and anything with an action stay until dismissed or acted on, so `null` for them.
 */
export const resolveDuration = (options: SnackbarOptions): number | null => {
    const severity = options.severity ?? 'info';
    if (
        options.persistent ||
        options.action ||
        options.secondaryAction ||
        options.jump ||
        severity === 'error' ||
        severity === 'warning'
    ) {
        return null;
    }
    if (options.durationMs !== undefined) {
        if (options.durationMs <= 0) return null;
        return Math.min(SNACKBAR_MAX_DURATION_MS, Math.max(SNACKBAR_MIN_DURATION_MS, options.durationMs));
    }
    const reading = 2000 + 60 * (textLength(titleOf(options)) + textLength(options.description));
    return Math.min(SNACKBAR_MAX_DURATION_MS, Math.max(SNACKBAR_MIN_DURATION_MS, reading));
};

let anonymous = 0;

const textKey = (options: SnackbarOptions): string => {
    const severity = options.severity ?? 'info';
    // Elements count by the words they show, so `<b>Save failed</b>` and `<b>Delete failed</b>` stay two events.
    const text = [titleOf(options), options.description].map(plainText).join('|');
    // An element that shows no words of its own (`<Trans i18nKey="x" />`) has no identity to compare:
    // it is never merged with another one unless the caller gives a `key` or `causeKey`.
    if (text === '|') {
        anonymous += 1;
        return `${severity}:#${anonymous}`;
    }
    return `${severity}:${text}`;
};

const isJumpTarget = (jump: SnackbarJump | SnackbarJumpTarget): jump is SnackbarJumpTarget =>
    typeof jump === 'string' ||
    (typeof HTMLElement !== 'undefined' && jump instanceof HTMLElement) ||
    'current' in jump;

const normaliseJump = (jump: SnackbarJump | SnackbarJumpTarget | undefined): SnackbarJump | undefined => {
    if (jump === undefined) return undefined;
    return isJumpTarget(jump) ? { target: jump } : jump;
};

type Listener = () => void;

export interface SnackbarState {
    /** The oldest visible pop-up (the one that has been there longest). */
    current: SnackbarItem | undefined;
    /** Everything on screen, oldest first: the last one is nearest the corner. */
    visible: readonly SnackbarItem[];
    /** Waiting for a free place, in order. */
    queued: readonly SnackbarItem[];
}

const EMPTY: SnackbarState = { current: undefined, visible: [], queued: [] };

/** Pure queue logic, built so tests can drive it with a fake clock. */
export const createSnackbarStore = (now: () => number = Date.now) => {
    let state: SnackbarState = EMPTY;
    // Last time a message with this identity was raised. Outlives the pop-up so a repeat right
    // after it timed out is still the same event, not a new one.
    const lastRaised = new Map<string, number>();
    const lastCause = new Map<string, number>();
    const listeners = new Set<Listener>();

    const setState = (visible: readonly SnackbarItem[], queued: readonly SnackbarItem[]) => {
        state = visible.length === 0 && queued.length === 0 ? EMPTY : { current: visible[0], visible, queued };
        listeners.forEach((listener) => listener());
    };

    const prune = (at: number) => {
        [lastRaised, lastCause].forEach((seen) =>
            seen.forEach((raisedAt, key) => {
                if (at - raisedAt > SNACKBAR_DEDUPE_WINDOW_MS * 4) seen.delete(key);
            }),
        );
    };

    // A person who closed it, or acted on it, has seen it: if it happens again, it is news.
    const forget = (item: SnackbarItem) => {
        lastRaised.delete(item.key);
        if (item.causeKey) lastCause.delete(item.causeKey);
    };

    const finish = (item: SnackbarItem, reason: SnackbarCloseReason) => {
        try {
            item.onClose?.(reason);
        } catch {
            // A faulty callback must not stop the queue.
        }
    };

    const notify = (options: SnackbarOptions): string => {
        const at = now();
        const key = options.key ?? options.causeKey ?? textKey(options);
        const title = titleOf(options);
        const { jump, persistent, ...withTitle } = options;
        // `title` and `message` become the two fields of the item below.
        const rest: Omit<typeof withTitle, 'title' | 'message'> = Object.fromEntries(
            Object.entries(withTitle).filter(([name]) => name !== 'title' && name !== 'message'),
        );
        const item: SnackbarItem = {
            ...rest,
            key,
            title,
            message: title,
            severity: options.severity ?? 'info',
            jump: normaliseJump(jump),
            durationMs: resolveDuration({ ...options, persistent }),
            createdAt: at,
        };
        prune(at);

        // One cause, one pop-up: while it is visible, queued or just gone.
        if (options.causeKey) {
            const existing = [...state.visible, ...state.queued].find((other) => other.causeKey === options.causeKey);
            if (existing) return existing.key;
            const lastSeen = lastCause.get(options.causeKey);
            if (lastSeen !== undefined && at - lastSeen < SNACKBAR_DEDUPE_WINDOW_MS) return key;
            lastCause.set(options.causeKey, at);
        }

        const visibleAt = state.visible.findIndex((other) => other.key === key);
        if (visibleAt >= 0) {
            // Same message while it is on screen: keep one in the same place, take the newer text,
            // restart the timer.
            lastRaised.set(key, at);
            const visible = [...state.visible];
            const replaced = visible[visibleAt];
            visible[visibleAt] = item;
            setState(visible, state.queued);
            if (replaced.onClose && replaced.onClose !== item.onClose) finish(replaced, 'replaced');
            return key;
        }
        const queuedAt = state.queued.findIndex((other) => other.key === key);
        if (queuedAt >= 0) {
            lastRaised.set(key, at);
            const queued = [...state.queued];
            finish(queued[queuedAt], 'replaced');
            queued[queuedAt] = item;
            setState(state.visible, queued);
            return key;
        }
        const previous = lastRaised.get(key);
        if (previous !== undefined && at - previous < SNACKBAR_DEDUPE_WINDOW_MS && !options.key) {
            // The identical text was shown moments ago and is already gone: same event, not a new one.
            return key;
        }
        lastRaised.set(key, at);
        if (state.visible.length < SNACKBAR_MAX_VISIBLE) {
            setState([...state.visible, item], state.queued);
        } else {
            const queued = [...state.queued, item];
            // Errors stay: when the queue is full, the oldest waiting message that is not an error goes
            // first, and an error only makes room for a newer error.
            while (queued.length > MAX_QUEUE) {
                const drop = queued.findIndex((waiting) => waiting.severity !== 'error');
                finish(queued.splice(drop < 0 ? 0 : drop, 1)[0], 'replaced');
            }
            setState(state.visible, queued);
        }
        return key;
    };

    /** Take one pop-up off the screen and let the first waiting one move up. */
    const remove = (item: SnackbarItem, reason: SnackbarCloseReason) => {
        const visible = state.visible.filter((other) => other !== item);
        const [next, ...queued] = state.queued;
        setState(next ? [...visible, next] : visible, queued);
        if (reason === 'dismiss' || reason === 'action') forget(item);
        finish(item, reason);
    };

    /**
     * Close one visible pop-up by key, or the oldest visible one without a key. A stale timer for a
     * key that is gone (or was replaced) closes nothing.
     */
    const close = (reason: SnackbarCloseReason, key?: string) => {
        const item = key === undefined ? state.visible[0] : state.visible.find((other) => other.key === key);
        if (item) remove(item, reason);
    };

    const dismissKey = (key: string) => {
        const visible = state.visible.find((other) => other.key === key);
        if (visible) {
            remove(visible, 'dismiss');
            return;
        }
        const queuedAt = state.queued.findIndex((other) => other.key === key);
        if (queuedAt < 0) return;
        const queued = [...state.queued];
        const [removed] = queued.splice(queuedAt, 1);
        setState(state.visible, queued);
        forget(removed);
        finish(removed, 'dismiss');
    };

    const clear = () => {
        const pending = [...state.visible, ...state.queued];
        lastRaised.clear();
        lastCause.clear();
        setState([], []);
        pending.forEach((item) => finish(item, 'dismiss'));
    };

    return {
        notify,
        close,
        dismiss: dismissKey,
        clear,
        getState: () => state,
        subscribe: (listener: Listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
};

export type SnackbarStore = ReturnType<typeof createSnackbarStore>;

/** The one store of the app. */
export const snackbarStore: SnackbarStore = createSnackbarStore();

type SnackbarSugar = string | ReactElement | (Omit<SnackbarOptionsBase, 'durationMs'> & LegacyNotice);

/** The shape the antd `message` / `notification` calls had, so call sites keep their arguments. */
interface LegacyNotice {
    /** antd `message.error({ content })` */
    content?: ReactNode;
    /** The title: antd `notification.error({ message })` and the new API. */
    message?: ReactNode;
    title?: ReactNode;
    /** Seconds, as antd. Only success and info time out, so this is read for those; 0 = until closed. */
    duration?: number;
}

const toOptions = (severity: SnackbarSeverity, input: SnackbarSugar): SnackbarOptions => {
    // antd `message.success(<Content />)` took a bare node as the content.
    if (typeof input === 'string' || isValidElement(input)) return { message: input, severity };
    const { content, message, title, duration, ...rest } = input as LegacyNotice &
        Omit<SnackbarOptionsBase, 'durationMs'>;
    const options: SnackbarOptions = { ...rest, message: content ?? title ?? message, severity };
    if (duration !== undefined) {
        if (duration > 0) options.durationMs = duration * 1000;
        else options.persistent = true;
    }
    return options;
};

/** The sugar API over one store. The app uses the instance below; stories and tests bring their own. */
export const createSnackbarApi = (store: SnackbarStore) => ({
    notify: (options: SnackbarOptions) => store.notify(options),
    info: (input: SnackbarSugar) => store.notify(toOptions('info', input)),
    success: (input: SnackbarSugar) => store.notify(toOptions('success', input)),
    warning: (input: SnackbarSugar) => store.notify(toOptions('warning', input)),
    error: (input: SnackbarSugar) => store.notify(toOptions('error', input)),
    /** Close one pop-up by the key `notify` returned, or the oldest visible one without a key. */
    dismiss: (key?: string) => (key ? store.dismiss(key) : store.close('dismiss')),
    /** Drop everything, visible and queued. */
    clear: () => store.clear(),
});

export type SnackbarApi = ReturnType<typeof createSnackbarApi>;

/**
 * The channel every part of the Admin uses.
 *
 * ```ts
 * snackbar.success(t('x.saved'));                      // times out after 4 s, has a close button
 * snackbar.error(t('message.error.default'));          // stays until dismissed
 * snackbar.error({
 *     title: t('x.failed'),
 *     description: t('x.failedHint'),
 *     jump: { target: 'tile-statistics' },             // "Ansehen": scrolls there and focuses it
 *     causeKey: 'tenant-api-down',                     // six cards, one outage, one pop-up
 * });
 * ```
 */
export const snackbar: SnackbarApi = createSnackbarApi(snackbarStore);
