import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const launcherCss = readFileSync(resolve(__dirname, './tourLauncher.module.scss'), 'utf8');
const snackbarCss = readFileSync(resolve(__dirname, '../Snackbar/SnackbarHost.module.scss'), 'utf8');
const mobileBarCss = readFileSync(resolve(__dirname, '../Layout/adminMobileNavBar.module.scss'), 'utf8');

const zIndexOf = (css: string) => Number(/z-index:\s*(\d+)/.exec(css)?.[1]);

// Floating buttons must never lie on top of each other (plan 3.5).
describe('tour launcher placement', () => {
    it('is fixed bottom-right, outside the page flow', () => {
        expect(launcherCss).toMatch(/position:\s*fixed/);
        expect(launcherCss).toMatch(/right:/);
        expect(launcherCss).toMatch(/bottom:/);
    });

    it('stays below the phone bottom bar, so its open menu and scrim cover the launcher', () => {
        expect(zIndexOf(launcherCss)).toBeLessThan(zIndexOf(mobileBarCss));
    });

    it('is lifted above the measured phone bottom bar', () => {
        expect(launcherCss).toContain('var(--tour-launcher-nav-inset');
    });

    it('lifts the pop-up stack above the launcher in the same corner', () => {
        expect(snackbarCss).toContain('[data-admin-tour-launcher]');
    });
});
