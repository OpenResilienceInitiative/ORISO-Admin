import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { AdminSidebarNavItem } from '../AdminSidebar';
import { activeNavIconFor } from '../NavIcon';
import {
    buildSectionTabIconSvg,
    measureGlyphBox,
    readSectionTabColors,
    resolveSectionNavItem,
    svgToPngDataUrl,
    toSvgDataUrl,
} from './sectionTabIcon';
import { restoreDefaultTabIcon, showSectionTabIcon } from './tabIconLinks';
import { restoreDefaultTitle, showSectionTitle } from './tabTitle';

/**
 * The theme colours, re-read whenever the admin theme rewrites the root's inline tokens
 * (`applyAdminTheme` → `--m3-primary` / `--m3-on-primary`), so a Träger's own colours reach the
 * tab as soon as they load or change.
 */
const useThemeTabColors = () => {
    const [colors, setColors] = useState(readSectionTabColors);
    useEffect(() => {
        const root = document.documentElement;
        const update = () =>
            setColors((previous) => {
                const next = readSectionTabColors(root);
                return next.tile === previous.tile && next.glyph === previous.glyph ? previous : next;
            });
        update();
        if (typeof MutationObserver === 'undefined') return undefined;
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
        return () => observer.disconnect();
    }, []);
    return colors;
};

/**
 * Gives the browser tab the name and icon of the sidebar section the admin is in (Konten,
 * Beratungsstellen, Mein Account, …): the sidebar's own glyph and label, in the Träger colours.
 * Mounted in the authenticated layout only, so login, password reset, onboarding and imprint keep
 * the default favicon and title; unmounting (logout) restores both.
 */
export const SectionTabIdentity = ({
    navItems,
    accountItem,
}: {
    navItems: ReadonlyArray<AdminSidebarNavItem>;
    accountItem?: AdminSidebarNavItem;
}) => {
    const { pathname } = useLocation();
    const colors = useThemeTabColors();
    const sections = useMemo(() => (accountItem ? [...navItems, accountItem] : [...navItems]), [navItems, accountItem]);
    const item = resolveSectionNavItem(pathname, sections);
    const Icon = item ? activeNavIconFor(item.iconPath) : null;
    // Only the section name, already translated by useAdminNavigation (Frank, 2026-11-17).
    const sectionTitle = item?.label || null;

    useEffect(() => {
        if (sectionTitle) showSectionTitle(sectionTitle);
        else restoreDefaultTitle();
    }, [sectionTitle]);

    useEffect(() => {
        if (!Icon) {
            restoreDefaultTabIcon();
            return undefined;
        }
        let current = true;
        const svg = buildSectionTabIconSvg(Icon, colors, { fit: 'tab', box: measureGlyphBox(Icon) });
        const svgHref = toSvgDataUrl(svg);
        showSectionTabIcon({ svgHref, pngHref: null });
        svgToPngDataUrl(svg).then((pngHref) => {
            if (current && pngHref) showSectionTabIcon({ svgHref, pngHref });
        });
        return () => {
            current = false;
        };
    }, [Icon, colors]);

    useEffect(
        () => () => {
            restoreDefaultTabIcon();
            restoreDefaultTitle();
        },
        [],
    );

    return null;
};

export default SectionTabIdentity;
