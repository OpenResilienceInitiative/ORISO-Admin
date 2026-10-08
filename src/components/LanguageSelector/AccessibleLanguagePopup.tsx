import { useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { ownDomAttributes } from '../../utils/ownedDomAttributes';

/** Move the existing controlled listbox boundary onto its actual scrolling surface. */
export const applyLanguagePopupBoundary = (root: HTMLElement, label: string) => {
    const holders = root.querySelectorAll<HTMLElement>('.rc-virtual-list > .rc-virtual-list-holder');
    if (holders.length !== 1) return undefined;
    const holder = holders[0];
    const lists = holder.querySelectorAll<HTMLElement>('.rc-virtual-list-holder-inner[role="listbox"]');
    if (lists.length !== 1 || holder.hasAttribute('role') || holder.hasAttribute('id')) return undefined;
    const list = lists[0];
    const { id } = list;
    const controlled =
        id &&
        Array.from(root.ownerDocument.querySelectorAll('[role="combobox"]')).some((combo) =>
            (combo.getAttribute('aria-controls') ?? '').split(/\s+/).includes(id),
        );
    if (!controlled || !list.querySelector('[role="option"]')) return undefined;
    const names = [
        'role',
        'id',
        'aria-label',
        'aria-labelledby',
        'aria-multiselectable',
        'aria-orientation',
        'aria-describedby',
    ];
    const original = Object.fromEntries(names.map((name) => [name, list.getAttribute(name)]));
    const restoreList = ownDomAttributes(list, Object.fromEntries(names.map((name) => [name, null])));
    const restoreHolder = ownDomAttributes(holder, { ...original, 'aria-label': original['aria-label'] ?? label });
    return () => {
        restoreHolder();
        restoreList();
    };
};

export const AccessibleLanguagePopup = ({ menu, label }: { menu: ReactElement; label: string }) => {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = root.current;
        if (!element) return undefined;
        const popup = element.closest<HTMLElement>('.ant-select-dropdown');
        let release: (() => void) | undefined;
        const apply = () => {
            release?.();
            release = undefined;
            // Keep semantics through the closing animation; release once the popup is hidden.
            if (popup?.classList.contains('ant-select-dropdown-hidden') || popup?.style.display === 'none') return;
            release = applyLanguagePopupBoundary(element, label);
        };
        apply();
        const observer = new MutationObserver(apply);
        const visibilityObserver = new MutationObserver(apply);
        if (popup) visibilityObserver.observe(popup, { attributes: true, attributeFilter: ['class', 'style'] });
        observer.observe(element, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            visibilityObserver.disconnect();
            release?.();
        };
    }, [label]);
    return <div ref={root}>{menu}</div>;
};
