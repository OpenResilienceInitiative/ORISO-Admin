import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './m3FabMenu.module.scss'), 'utf8');
const actionBlock = styles.slice(styles.indexOf('.action {'), styles.indexOf('.action.openDownward'));

describe('M3FabMenu action colour roles', () => {
    it('uses the eight-pixel Figma gap for both Menu Top and Menu Bottom', () => {
        expect(styles).toMatch(/bottom:\s*calc\(100% \+ 8px\)/i);
        expect(styles).toMatch(/top:\s*calc\(100% \+ 8px\)/i);
    });

    it('binds the primary action roles to theme tokens instead of a hard-coded red (#992)', () => {
        expect(styles).not.toMatch(/#cc1e1c/i);
        expect(styles).not.toMatch(/--oriso-app-/);
        expect(actionBlock).toMatch(/--m3-fab-menu-primary-container:\s*var\(--m3-primary,\s*#a5000a\)/i);
        expect(actionBlock).toMatch(/--m3-fab-menu-on-primary-container:\s*var\(--m3-primary-container,\s*#ffe2de\)/i);
        expect(actionBlock).toMatch(/\.item\s*{[^}]*background:\s*var\(--m3-fab-menu-primary-container\)/is);
        expect(actionBlock).toMatch(/\.item\s*{[^}]*color:\s*var\(--m3-fab-menu-on-primary-container\)/is);
        expect(actionBlock).not.toMatch(/\.itemActive\s*{[^}]*(?:outline|box-shadow)/is);
        expect(actionBlock).toMatch(/\.item:focus-visible\s*{[^}]*box-shadow:\s*none/is);
        expect(actionBlock).toMatch(/\.item:focus-visible\s*{[^}]*background:\s*color-mix\(/is);
    });

    it('colours neutral actions per item, not per menu, so the tone follows the action (#992)', () => {
        expect(actionBlock).toMatch(/--m3-fab-menu-secondary:\s*var\(--m3-secondary,\s*#4c555f\)/i);
        expect(actionBlock).toMatch(
            /--m3-fab-menu-on-secondary-container:\s*var\(--m3-on-secondary-container,\s*#e7effc\)/i,
        );
        expect(actionBlock).toMatch(/\.itemNeutral\s*{[^}]*background:\s*var\(--m3-fab-menu-secondary\)/is);
        expect(actionBlock).toMatch(/\.itemNeutral\s*{[^}]*color:\s*var\(--m3-fab-menu-on-secondary-container\)/is);
        // The closed FAB still reports the current value; only the FAB keeps the menu-level tone.
        expect(actionBlock).toMatch(
            /\.action\.neutral\s*{[^}]*\.fab\s*{[^}]*background:\s*var\(--m3-fab-menu-secondary\)/is,
        );
        expect(actionBlock).not.toMatch(/\.action\.neutral\s*{[^}]*\.item[,\s]/is);
    });

    it('keeps long action labels inside a six-pixel smartphone inset', () => {
        expect(styles).toMatch(
            /@media screen and \(max-width:\s*767px\)[\s\S]*\.action[\s\S]*\.stack[\s\S]*max-width:\s*calc\(100vw - 12px\)/i,
        );
        expect(styles).toMatch(
            /@media screen and \(max-width:\s*767px\)[\s\S]*\.action[\s\S]*\.item[\s\S]*max-width:\s*calc\(100vw - 12px\)/i,
        );
    });
});
