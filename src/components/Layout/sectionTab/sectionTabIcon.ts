import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_ADMIN_SEED } from '../../../utils/applyAdminTheme';
import { computeOrisoPalette } from '../../../utils/theme/orisoScheme';
import type { AdminSidebarNavItem } from '../AdminSidebar';
import { activeNavIconFor } from '../NavIcon';
import { resolveActiveNavKey } from '../resolveActiveNavKey';

/**
 * Per-section browser tab icon.
 *
 * The tab shows the glyph the sidebar shows for the active section, in the theme's `on-primary`
 * colour on a rounded tile in the theme's `primary` colour — the Träger colours the admin theme
 * writes as `--m3-primary` / `--m3-on-primary`. It is computed on every route or theme change
 * from what is already in memory; nothing is stored.
 */

const TILE_SIZE = 64;
const TILE_RADIUS = 14;

/**
 * How much of the 64-unit tile the glyph's ink fills. Frank, 2026-11-17: small icons need little
 * padding to stay readable; a large preview looks right with more air around the glyph. No extra
 * line weight (Frank: it filled the glyphs' inner details).
 *   tab   — the real browser tab icon (shown at 16–32 px)
 *   large — previews (Storybook, 64 px and up)
 */
export type SectionTabFit = 'tab' | 'large';
export const SECTION_TAB_FITS: Record<SectionTabFit, number> = {
    tab: 46,
    large: 38,
};
/** Without a measured ink box, the icon's own viewBox (with its padding) is used. */
const UNMEASURED_GLYPH = 40;

export const PRIMARY_TOKEN = '--m3-primary';
export const ON_PRIMARY_TOKEN = '--m3-on-primary';

type IconComponent = ComponentType<object>;

export interface SectionTabColors {
    /** Tile: the theme's primary colour. */
    tile: string;
    /** Glyph: the theme's on-primary colour. */
    glyph: string;
}

const trimSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * The sidebar entry whose section `pathname` is in, or null (login, onboarding, imprint, unknown
 * routes: the default favicon stays). Uses the sidebar's own rule (`resolveActiveNavKey`: own path
 * or below it, plus `activeMatch`, most specific wins); trailing slashes are ignored like
 * `NavLink` does (`/admin/profil/`).
 */
export const resolveSectionNavItem = (
    pathname: string,
    items: ReadonlyArray<AdminSidebarNavItem> | undefined,
): AdminSidebarNavItem | null => {
    const withGlyph = (items ?? []).filter((item) => activeNavIconFor(item.iconPath));
    const key = resolveActiveNavKey(
        withGlyph.map((item) => ({ ...item, to: trimSlash(item.to) })),
        trimSlash(pathname),
    );
    return withGlyph.find((item) => item.key === key) ?? null;
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.%\s,/+-]+\)$/i;

/**
 * `color` if it is a plain hex / rgb() / hsl() colour, else `fallback`. The value goes into SVG
 * markup, so anything else is rejected rather than escaped.
 */
export const resolveTabColor = (color: string | null | undefined, fallback: string): string => {
    const value = typeof color === 'string' ? color.trim() : '';
    return HEX.test(value) || FUNCTIONAL.test(value) ? value : fallback;
};

let defaultColors: SectionTabColors | null = null;
/** The default theme's tokens (seed `DEFAULT_ADMIN_SEED`), for a root without any. */
const defaultTabColors = (): SectionTabColors => {
    if (!defaultColors) {
        const { tokens } = computeOrisoPalette({ primary: DEFAULT_ADMIN_SEED, accentDark: DEFAULT_ADMIN_SEED });
        defaultColors = { tile: tokens[PRIMARY_TOKEN], glyph: tokens[ON_PRIMARY_TOKEN] };
    }
    return defaultColors;
};

/** The current theme's primary / on-primary, read from the root at runtime. */
export const readSectionTabColors = (root: HTMLElement = document.documentElement): SectionTabColors => {
    const fallback = defaultTabColors();
    let style: CSSStyleDeclaration | null = null;
    try {
        style = getComputedStyle(root);
    } catch {
        style = null;
    }
    const read = (token: string) => style?.getPropertyValue(token) || root.style.getPropertyValue(token);
    return {
        tile: resolveTabColor(read(PRIMARY_TOKEN), fallback.tile),
        glyph: resolveTabColor(read(ON_PRIMARY_TOKEN), fallback.glyph),
    };
};

/** The glyph's ink bounds in its own viewBox units. */
export interface GlyphBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Measures where the glyph actually draws (its ink), so every icon fills the tile equally whatever
 * padding its file carries. Needs a rendering browser; returns null elsewhere (jsdom), and the
 * icon's own viewBox is used.
 */
export const measureGlyphBox = (Icon: IconComponent): GlyphBox | null => {
    let host: SVGSVGElement | null = null;
    try {
        host = document.createElementNS(SVG_NS, 'svg');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
        // Markup rendered from our own bundled icon component, not user input.
        host.innerHTML = renderToStaticMarkup(createElement(Icon));
        const inner = host.firstElementChild;
        if (!inner) return null;
        const ink = document.createElementNS(SVG_NS, 'g');
        while (inner.firstChild) ink.appendChild(inner.firstChild);
        inner.appendChild(ink);
        document.body.appendChild(host);
        const box = (ink as SVGGElement).getBBox?.();
        return box && box.width > 0 && box.height > 0
            ? { x: box.x, y: box.y, width: box.width, height: box.height }
            : null;
    } catch {
        return null;
    } finally {
        host?.remove();
    }
};

/** Place the rendered icon's root `<svg>` inside the tile, cropped to its ink when measured. */
const placeGlyph = (markup: string, fit: SectionTabFit, box: GlyphBox | null): string =>
    markup.replace(/^<svg\b([^>]*)>/, (_match, attrs: string) => {
        const stripped = attrs.replace(
            /\s(?:width|height|x|y|class|role|focusable|aria-hidden|aria-label)="[^"]*"/g,
            '',
        );
        const size = box ? SECTION_TAB_FITS[fit] : UNMEASURED_GLYPH;
        const offset = (TILE_SIZE - size) / 2;
        // Crop to the ink so every glyph fills the tile equally.
        const rest = (
            box
                ? `${stripped.replace(/\sviewBox="[^"]*"/, '')} viewBox="${round(box.x)} ${round(box.y)} ${round(
                      box.width,
                  )} ${round(box.height)}"`
                : stripped
        ).trim();
        return `<svg x="${offset}" y="${offset}" width="${size}" height="${size}"${rest ? ` ${rest}` : ''}>`;
    });

/** The tab icon as standalone SVG markup. */
export const buildSectionTabIconSvg = (
    Icon: IconComponent,
    colors: SectionTabColors,
    { fit = 'tab', box = null }: { fit?: SectionTabFit; box?: GlyphBox | null } = {},
): string => {
    const fallback = defaultTabColors();
    const tile = resolveTabColor(colors.tile, fallback.tile);
    const glyphColor = resolveTabColor(colors.glyph, fallback.glyph);
    const glyph = placeGlyph(renderToStaticMarkup(createElement(Icon)), fit, box);
    // The navbar glyph files hard-code their fill (#141C25); the style recolours every filled shape.
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" width="${TILE_SIZE}" height="${TILE_SIZE}">`,
        `<rect width="${TILE_SIZE}" height="${TILE_SIZE}" rx="${TILE_RADIUS}" fill="${tile}"/>`,
        `<style>.glyph [fill]:not([fill="none"]){fill:${glyphColor}}</style>`,
        `<g class="glyph" fill="${glyphColor}" color="${glyphColor}">${glyph}</g>`,
        `</svg>`,
    ].join('');
};

export const toSvgDataUrl = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

/**
 * PNG copy of the icon for browsers that ignore SVG tab icons (Safari). Resolves null where there
 * is no canvas (unit tests, very old browsers).
 */
export const svgToPngDataUrl = (svg: string, size = 32): Promise<string | null> =>
    new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext?.('2d');
            if (!context || typeof Image === 'undefined') {
                resolve(null);
                return;
            }
            canvas.width = size;
            canvas.height = size;
            const image = new Image();
            image.onload = () => {
                try {
                    context.drawImage(image, 0, 0, size, size);
                    resolve(canvas.toDataURL('image/png'));
                } catch {
                    resolve(null);
                }
            };
            image.onerror = () => resolve(null);
            image.src = toSvgDataUrl(svg);
        } catch {
            resolve(null);
        }
    });
