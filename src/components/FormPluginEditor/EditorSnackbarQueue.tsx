import { Fragment, isValidElement, ReactNode } from 'react';

export interface EditorSnackbarQueueItem {
    /** Stable identity across dismissals and updates. */
    key: string;
    node: ReactNode;
}

/**
 * Editor notices are pop-ups on the shared snackbar channel (Frank, 2026-11-07: never stacked in the
 * page). Each item's node renders nothing in the layout; the channel shows them one after another.
 * Kept as a component so callers keep composing notices per card layer.
 */
export const EditorSnackbarQueue = ({
    items,
}: {
    items: Array<EditorSnackbarQueueItem | false | null | undefined>;
}) => (
    <>
        {items
            .filter((item): item is EditorSnackbarQueueItem => !!item)
            .map((item) => (
                <Fragment key={item.key}>{item.node}</Fragment>
            ))}
    </>
);

/** Compose notices from nested legal-card layers into one visual stack. */
export const editorSnackbarItems = (
    slot: ReactNode,
    key: string,
): Array<EditorSnackbarQueueItem | false | null | undefined> => {
    if (!slot) return [];
    if (
        isValidElement<{ items: Array<EditorSnackbarQueueItem | false | null | undefined> }>(slot) &&
        slot.type === EditorSnackbarQueue
    ) {
        return slot.props.items;
    }
    return [{ key, node: slot }];
};

export default EditorSnackbarQueue;
