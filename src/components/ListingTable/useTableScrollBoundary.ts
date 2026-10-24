import { useLayoutEffect, type RefObject } from 'react';
import { ownDomAttributes } from '../../utils/ownedDomAttributes';

/** Only the actual AntD scroll holder becomes a named keyboard scroll region. */
export const applyTableScrollBoundary = (root: HTMLElement, label: string) => {
    const bodies = Array.from(root.querySelectorAll<HTMLElement>('.ant-table-body')).filter(
        (body) => body.closest('.ant-table-wrapper')?.parentElement === root,
    );
    const restore = bodies.flatMap((body) => {
        if (body.hasAttribute('role') || body.hasAttribute('tabindex')) return [];
        return [ownDomAttributes(body, { role: 'region', tabindex: '0', 'aria-label': label })];
    });
    return () => restore.forEach((release) => release());
};

export const useTableScrollBoundary = (root: RefObject<HTMLDivElement | null>, label?: string) => {
    useLayoutEffect(() => {
        if (!root.current || !label) return undefined;
        const element = root.current;
        let release = applyTableScrollBoundary(element, label);
        const observer = new MutationObserver(() => {
            release();
            release = applyTableScrollBoundary(element, label);
        });
        observer.observe(element, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            release();
        };
    }, [root, label]);
};
