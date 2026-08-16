import type { JSX, ReactNode } from 'react';
import { useRegisterMobileNav } from '../AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';

export interface PageMobileActionsProps {
    /** Distinguishes this page's registration; one per page is enough. */
    id: string;
    search?: { label: string; placeholder?: string; onSearch: (term: string) => void };
    add?: { label: string; onAdd: () => void };
    /** The desktop toolbar. Rendered unchanged above @screen-md. */
    children?: ReactNode;
}

/**
 * Moves a page's search and create action into the mobile bottom bar.
 *
 * On desktop this renders the page's own toolbar untouched. On a phone the
 * toolbar disappears and its two actions reappear in the bar's search row,
 * within thumb reach and in the same place on every screen — which is the whole
 * point of the redesign (Figma 1683:41718).
 */
export const PageMobileActions = ({ add, children, id, search }: PageMobileActionsProps) => {
    const isDesktopLayout = useIsDesktopLayout();

    useRegisterMobileNav(`page-actions-${id}`, isDesktopLayout ? null : { search, add });

    if (!isDesktopLayout) {
        return null;
    }

    // A node, not an element: the desktop toolbar is usually several controls.
    return children as JSX.Element;
};

export default PageMobileActions;
