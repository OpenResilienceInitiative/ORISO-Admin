import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const desktopTabs = readFileSync(resolve(__dirname, './AdminSegmentedTabs.module.scss'), 'utf8');
const mobileChips = readFileSync(
    resolve(__dirname, '../M3ConnectedButtonGroup/m3ConnectedButtonGroup.module.scss'),
    'utf8',
);

const block = (source: string, selector: string, until: string) =>
    source.slice(source.indexOf(selector), source.indexOf(until, source.indexOf(selector) + selector.length));

/**
 * #1374: the desktop sub-navigation is one underline tab bar for every page
 * (Settings, Logs, Statistics, Invites, Users). Colours come from M3 tokens so
 * tenant brand colours apply; the old filled-pill treatment is gone.
 */
describe('desktop sub-navigation tab bar (#1374)', () => {
    it('draws a full-width outline-variant divider under the tabs', () => {
        expect(block(desktopTabs, '.container {', '.list {')).toMatch(
            /box-shadow:\s*inset 0 -1px 0 0 var\(--m3-outline-variant,\s*#c4c7c8\)/,
        );
    });

    it('spaces the tabs with a fixed 4px gap and neither wraps nor scrolls (overflow goes behind „Mehr“)', () => {
        const list = block(desktopTabs, '.list {', '.item {');
        expect(list).toMatch(/gap:\s*4px/);
        expect(list).toMatch(/overflow:\s*hidden/);
        expect(list).not.toMatch(/overflow-x:\s*auto/);
        expect(list).not.toMatch(/flex-wrap:\s*wrap/);
    });

    it('keeps tabs hidden behind „Mehr“ out of the layout, and „Mehr“ at the end of the bar', () => {
        expect(desktopTabs).toMatch(/\.item\[hidden\]\s*\{\s*display:\s*none;/);
        expect(block(desktopTabs, '.more {', '/* Icons')).toMatch(/margin-inline-start:\s*auto/);
    });

    it('sizes each tab at 48px with 0 16px padding and 14/20 medium labels that never truncate', () => {
        const item = block(desktopTabs, '.item {', '.itemActive');
        expect(item).toMatch(/height:\s*48px/);
        expect(item).toMatch(/padding:\s*0 16px/);
        expect(item).toMatch(/font-size:\s*14px/);
        expect(item).toMatch(/line-height:\s*20px/);
        expect(item).toMatch(/font-weight:\s*500/);
        expect(item).toMatch(/white-space:\s*nowrap/);
        expect(item).not.toMatch(/text-overflow:\s*ellipsis/);
    });

    it('uses on-surface-variant for inactive tabs and no filled background', () => {
        const item = block(desktopTabs, '.item {', '&:after');
        expect(item).toMatch(/color:\s*var\(--m3-on-surface-variant,\s*#444748\)/);
        expect(item).toMatch(/background:\s*transparent/);
        expect(desktopTabs).not.toMatch(/--m3-secondary-container/);
    });

    it('marks the active tab with primary text and a 3px primary underline', () => {
        expect(block(desktopTabs, '.item {', '&:hover')).toMatch(/height:\s*3px/);
        const active = block(desktopTabs, '.itemActive,', '.itemDisabled {');
        expect(active).toMatch(/color:\s*var\(--m3-primary,\s*#a5000a\)/);
        expect(active).toMatch(/background:\s*var\(--m3-primary,\s*#a5000a\)/);
    });

    it('keeps the shared focus ring inside the clipped list', () => {
        // The app-wide ring (app.css) reads the offset token, so the token itself must move the ring inside.
        const focus = block(desktopTabs, '&:focus-visible {', '}');
        expect(focus).toMatch(/--admin-focus-ring-offset:\s*-2px/);
        expect(focus).toMatch(/outline:\s*2px solid var\(--admin-focus-ring-color\)/);
        expect(focus).not.toMatch(/var\(--m3-primary/);
    });

    it('renders 18px monochrome icons in currentColor', () => {
        const icon = block(desktopTabs, '.icon {', '.label {');
        expect(icon).toMatch(/width:\s*18px/);
        expect(icon).toMatch(/color:\s*currentColor/);
    });
});

describe('mobile subsection chips (#900)', () => {
    it('keep their M3 tokens', () => {
        expect(mobileChips).toMatch(/background:\s*var\(--m3-secondary-container,\s*#646d78\)/);
        expect(mobileChips).toMatch(/color:\s*var\(--m3-on-secondary-container,\s*#e7effc\)/);
        expect(mobileChips).toMatch(/background:\s*var\(--m3-secondary,\s*#4c555f\)/);
        expect(mobileChips).toMatch(/color:\s*var\(--m3-primary-fixed,\s*#ffe2de\)/);
    });

    it('keep a visible focus ring that is not clipped by the scrollport', () => {
        // Nested SCSS (`&:focus-visible`) — assert the compiled source shape.
        expect(mobileChips).toMatch(/&:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px/s);
        expect(mobileChips).toMatch(/padding-block:\s*3px/);
    });
});
