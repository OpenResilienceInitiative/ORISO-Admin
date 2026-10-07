import { isValidElement, ReactNode, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './M3RichTextEditor.module.scss';

export interface EditorSnackbarQueueItem {
    /** Stable identity across dismissals and updates. */
    key: string;
    node: ReactNode;
}

/** Editor-local notice stack. Higher-priority items appear above later items. */
export const EditorSnackbarQueue = ({
    items,
}: {
    items: Array<EditorSnackbarQueueItem | false | null | undefined>;
}) => {
    const { t } = useTranslation();
    const visible = items.filter((item): item is EditorSnackbarQueueItem => !!item);
    const positions = useRef(new Map<string, number>());
    const stack = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const next = new Map<string, number>();
        stack.current?.querySelectorAll<HTMLElement>('[data-snackbar-key]').forEach((element) => {
            const { snackbarKey: key } = element.dataset;
            if (!key) return;
            const { top } = element.getBoundingClientRect();
            const previous = positions.current.get(key);
            if (
                previous !== undefined &&
                previous !== top &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                element.animate?.([{ transform: `translateY(${previous - top}px)` }, { transform: 'translateY(0)' }], {
                    duration: 220,
                    easing: 'cubic-bezier(0.2, 0, 0, 1)',
                });
            }
            next.set(key, top);
        });
        positions.current = next;
    });

    return visible.length ? (
        <div ref={stack} className={styles.snackbarStack} role="region" aria-label={t('legal.m3Editor.notices')}>
            {visible.map((item) => (
                <div key={item.key} data-snackbar-key={item.key} className={styles.snackbarStackItem}>
                    {item.node}
                </div>
            ))}
        </div>
    ) : null;
};

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
