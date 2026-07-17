import { theme as antdTheme, type ThemeConfig } from 'antd';

import { computeOrisoPalette, type OrisoSchemeName } from '../utils/theme/orisoScheme';
import type { TenantSeeds } from '../utils/themeSeeds';

/**
 * Bridges the M3/OrisoScheme design tokens into antd's ConfigProvider theme.
 *
 * Historically antd was themed with three hard-coded values (`colorPrimary
 * #273270`, `colorLink #273270`, `borderRadius 4`) that had nothing to do with
 * the Material-3 palette used by the SCSS modules, the MUI surfaces and the
 * Figma design. That is why antd components rendered blue while the rest of the
 * admin was muted-red M3. This module derives a full antd token set from the
 * same `computeOrisoPalette` source so every antd component inherits the M3
 * colours, radii and typography without any per-component restyling.
 */

// M3 body/medium is the admin's default text size; Inter is the M3 body face,
// Roboto the title face (see Figma variable defs).
const M3_FONT_FAMILY = "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// M3 corner radii. Cards/sheets use the large radius, controls the base one.
const M3_RADIUS = 8;
const M3_RADIUS_LG = 16;
const M3_RADIUS_SM = 4;

// M3 control size (also satisfies the WCAG 2.2 "target size" minimum far more
// comfortably than antd's default 32px control height).
const M3_CONTROL_HEIGHT = 40;

export interface AdminAntdThemeOptions {
    seeds?: TenantSeeds;
    scheme?: OrisoSchemeName;
}

/**
 * Build the antd {@link ThemeConfig} for the admin panel from the M3 palette.
 *
 * @param options.seeds  Tenant colour seeds; defaults to the platform seed
 *                        (`#A5000A`) when omitted.
 * @param options.scheme `'light'` (default) or `'inverted'` for the dark surface.
 */
export const buildAdminAntdTheme = ({ seeds, scheme = 'light' }: AdminAntdThemeOptions = {}): ThemeConfig => {
    const { tokens } = computeOrisoPalette(seeds ?? {}, scheme);
    const t = (name: string, fallback: string) => tokens[name] ?? fallback;

    // Field anatomy tokens (#313) — the same `--admin-field-*` values that
    // applyAdminTheme writes to :root, so raw antd fields and the SCSS-module
    // fields share one source of truth.
    const primary = t('--m3-primary', '#a5000a');
    const fieldSurface = t('--admin-field-surface', '#fcf9f9');
    const fieldOutline = t('--admin-field-outline', '#c4c7c8');
    const fieldSurfaceHover = t('--admin-field-surface-hover', '#f6f3f3');
    const fieldSelectedSurface = t('--admin-field-selected-surface', '#ffdad5');
    const fieldSelectedText = t('--admin-field-selected-text', '#930008');

    return {
        algorithm: scheme === 'inverted' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
            // Brand + semantic colours, straight from the M3 scheme.
            colorPrimary: primary,
            colorLink: primary,
            colorInfo: primary,
            colorError: t('--m3-error', '#b1005e'),
            colorWarning: t('--m3-warning', '#410001'),
            // Surfaces + text.
            colorTextBase: t('--m3-on-surface', '#1a1c1e'),
            colorBgBase: t('--m3-surface', '#fcf9f9'),
            colorBgContainer: t('--m3-surface-container-low', '#f7f3f4'),
            colorBgElevated: t('--m3-surface-container', '#f0edee'),
            colorBorder: fieldOutline,
            colorBorderSecondary: t('--m3-outline-variant', '#c4c7c8'),
            // Tonal selection (#313): selected dropdown/menu items are lit with
            // the light primary-container tonal instead of a grey wash.
            controlItemBgActive: fieldSelectedSurface,
            controlItemBgHover: fieldSurfaceHover,
            // M3 shape scale.
            borderRadius: M3_RADIUS,
            borderRadiusLG: M3_RADIUS_LG,
            borderRadiusSM: M3_RADIUS_SM,
            // M3 typography.
            fontFamily: M3_FONT_FAMILY,
            fontSize: 14,
            // M3 sizing (+ WCAG 2.2 target size headroom).
            controlHeight: M3_CONTROL_HEIGHT,
        },
        components: {
            // antd's Layout component keeps its own dark-navy defaults
            // (headerBg/footerBg) independent of the global token set above,
            // so without this override SiteHeader/SiteFooter render near-black
            // text on a dark background (see #276).
            Layout: {
                headerBg: t('--m3-surface-container-lowest', '#ffffff'),
                headerColor: t('--m3-on-surface', '#1a1c1e'),
                footerBg: t('--m3-surface-container-lowest', '#ffffff'),
                siderBg: t('--m3-surface-container-low', '#f7f3f4'),
            },
            // Field anatomy (#313): field surfaces sit one step lighter than the
            // workspace background, focus is a primary-coloured outline, and
            // selected options get the light tonal treatment.
            Input: {
                colorBgContainer: fieldSurface,
                hoverBg: fieldSurfaceHover,
                activeBg: fieldSurface,
                hoverBorderColor: primary,
                activeBorderColor: primary,
            },
            InputNumber: {
                colorBgContainer: fieldSurface,
                hoverBg: fieldSurfaceHover,
                activeBg: fieldSurface,
                hoverBorderColor: primary,
                activeBorderColor: primary,
            },
            Select: {
                selectorBg: fieldSurface,
                hoverBorderColor: primary,
                activeBorderColor: primary,
                optionActiveBg: fieldSurfaceHover,
                optionSelectedBg: fieldSelectedSurface,
                optionSelectedColor: fieldSelectedText,
            },
        },
    };
};
