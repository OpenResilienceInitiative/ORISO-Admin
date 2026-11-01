import { useLayoutEffect, useRef, type ReactElement, type RefObject } from 'react';
import { ownDomAttributes } from '../../utils/ownedDomAttributes';

/** rc-select duplicates required state onto a generic shell; keep the actual combobox state. */
export const applyRequiredComboboxBoundary = (root: HTMLElement) => {
    const shell = root.querySelector<HTMLElement>('.ant-select[aria-required]');
    const combo = shell?.querySelector<HTMLElement>('[role="combobox"]');
    if (
        !shell ||
        shell.hasAttribute('role') ||
        !combo ||
        shell.getAttribute('aria-required') !== combo.getAttribute('aria-required')
    )
        return undefined;
    return ownDomAttributes(shell, { 'aria-required': null });
};

export const useRequiredComboboxBoundary = (root: RefObject<HTMLDivElement | null>) => {
    useLayoutEffect(() => {
        if (!root.current) return undefined;
        return applyRequiredComboboxBoundary(root.current);
    });
};

/** Keep virtual proxy options semantic; remove invalid duplicate state from roleless painted rows only. */
export const applyVirtualOptionBoundary = (root: HTMLElement) => {
    const lists = Array.from(root.querySelectorAll<HTMLElement>('[role="listbox"][id]'));
    if (lists.length !== 1) return undefined;
    const list = lists[0];
    const combo = Array.from(root.ownerDocument.querySelectorAll('[role="combobox"]')).find((input) =>
        (input.getAttribute('aria-controls') ?? '').split(/\s+/).includes(list.id),
    );
    const holder = root.querySelector('.rc-virtual-list-holder');
    // Nonvirtual options already have roles; unknown layouts retain the library's original DOM.
    if (!combo || !holder || holder.contains(list) || !list.querySelector('[role="option"]')) return undefined;
    const releases = Array.from(holder.querySelectorAll<HTMLElement>('.ant-select-item-option[aria-selected]'))
        .filter((row) => !row.hasAttribute('role'))
        .map((row) => ownDomAttributes(row, { 'aria-selected': null }));
    return () => releases.forEach((release) => release());
};

export const AccessibleVirtualSelectPopup = ({ menu }: { menu: ReactElement }) => {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = root.current;
        if (!element) return undefined;
        let release = applyVirtualOptionBoundary(element);
        const options = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-selected', 'role', 'id'],
        };
        const observer = new MutationObserver(() => {
            observer.disconnect();
            release?.();
            release = applyVirtualOptionBoundary(element);
            observer.observe(element, options);
        });
        observer.observe(element, options);
        return () => {
            observer.disconnect();
            release?.();
        };
    }, []);
    return <div ref={root}>{menu}</div>;
};
