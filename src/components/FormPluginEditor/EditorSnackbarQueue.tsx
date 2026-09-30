import { Fragment, ReactNode } from 'react';

export interface EditorSnackbarQueueItem {
    /** Stable identity. A different key at the front replays the flip-in, so a new message reads as new. */
    key: string;
    node: ReactNode;
}

/**
 * The editor's one snackbar place (M3: one snackbar at a time). Items are in priority
 * order; the first present one is shown. When it closes, or a higher-priority one
 * arrives, the next flips in — the `.hintSnackbar` animation replays on every mount,
 * and the key change is what remounts it.
 */
export const EditorSnackbarQueue = ({
    items,
}: {
    items: Array<EditorSnackbarQueueItem | false | null | undefined>;
}) => {
    const visible = items.find((item): item is EditorSnackbarQueueItem => !!item);
    return visible ? <Fragment key={visible.key}>{visible.node}</Fragment> : null;
};

export default EditorSnackbarQueue;
