import { useLayoutEffect, type ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { applyAdminTheme, clearAdminInvertedThemeTokens } from '../applyAdminTheme';
import { contrastRatio } from '../contrastRatio';
import { buildAdminAntdTheme } from '../../theme/antdM3Theme';

/**
 * Storybook-only: renders a story in the personal DARK scheme the app applies for
 * `prefers-color-scheme: dark` (AdminDisplayProvider → useAdminTheme → applyAdminTheme), with the
 * antd theme built for the same scheme. Regression frame for the dark-mode contrast fixes: a text
 * that is hard-coded or on a theme-invariant fill shows up here as an unreadable pair.
 */
export const DarkScheme = ({ children }: { children: ReactNode }) => {
    useLayoutEffect(() => {
        applyAdminTheme(null, document.documentElement, 'dark');
        return () => clearAdminInvertedThemeTokens();
    }, []);

    return (
        <ConfigProvider theme={buildAdminAntdTheme({ scheme: 'dark' })}>
            <div style={{ padding: 24, background: 'var(--m3-surface)', color: 'var(--m3-on-surface)' }}>
                {children}
            </div>
        </ConfigProvider>
    );
};

const rgbToHex = (rgb: string): string => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0'])
        .slice(0, 3)
        .map((part) => Math.round(Number(part)));
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
};

/** First ancestor (or the element itself) with an opaque background: what the text sits on. */
const paintedBackground = (element: Element): string => {
    let node: Element | null = element;
    while (node) {
        const { backgroundColor } = getComputedStyle(node);
        const alpha = backgroundColor.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1];
        if (backgroundColor !== 'transparent' && (alpha === undefined || Number(alpha) === 1)) {
            return rgbToHex(backgroundColor);
        }
        node = node.parentElement;
    }
    return '#ffffff';
};

/** WCAG contrast of an element's text colour against the surface it is painted on. */
export const textContrast = (element: Element): number =>
    contrastRatio(rgbToHex(getComputedStyle(element).color), paintedBackground(element));
