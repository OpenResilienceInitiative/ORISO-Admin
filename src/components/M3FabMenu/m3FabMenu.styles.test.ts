import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './m3FabMenu.module.scss'), 'utf8');
const actionBlock = styles.slice(styles.indexOf('.action {'), styles.indexOf('.action.openDownward'));

describe('M3FabMenu action colour roles', () => {
    it('uses the Figma primary-container roles without a selected-item outline', () => {
        expect(actionBlock).toMatch(/--m3-fab-menu-primary-container:\s*var\(--oriso-app-action,\s*#cc1e1c\)/i);
        expect(actionBlock).toMatch(
            /--m3-fab-menu-on-primary-container:\s*var\(--oriso-app-accent-light,\s*#ffe2de\)/i,
        );
        expect(actionBlock).toMatch(/\.item\s*{[^}]*background:\s*var\(--m3-fab-menu-primary-container\)/is);
        expect(actionBlock).toMatch(/\.item\s*{[^}]*color:\s*var\(--m3-fab-menu-on-primary-container\)/is);
        expect(actionBlock).not.toMatch(/\.itemActive\s*{[^}]*(?:outline|box-shadow)/is);
        expect(actionBlock).toMatch(/\.item:focus-visible\s*{[^}]*box-shadow:\s*none/is);
        expect(actionBlock).toMatch(/\.item:focus-visible\s*{[^}]*background:\s*color-mix\(/is);
    });

    it('uses the Figma secondary roles for deactivated actions', () => {
        expect(actionBlock).toMatch(/--m3-fab-menu-secondary:\s*var\(--m3-secondary,\s*#4c555f\)/i);
        expect(actionBlock).toMatch(
            /--m3-fab-menu-on-secondary-container:\s*var\(--m3-on-secondary-container,\s*#e7effc\)/i,
        );
        expect(actionBlock).toMatch(
            /\.action\.neutral\s*{[^}]*\.item,[^}]*\.fab\s*{[^}]*background:\s*var\(--m3-fab-menu-secondary\)/is,
        );
        expect(actionBlock).toMatch(/\.action\.neutral\s*{[^}]*color:\s*var\(--m3-fab-menu-on-secondary-container\)/is);
    });
});
