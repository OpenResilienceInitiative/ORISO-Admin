import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const permissionsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('PermissionsSettings responsive card contract', () => {
    it('keeps 425px desktop cards before smartphone stacking takes over', () => {
        expect(permissionsStyles).toMatch(/--card-deck-item-min-width:\s*425px;/);
        expect(permissionsStyles).toMatch(/--card-deck-item-width:\s*425px;/);
        expect(permissionsStyles).toMatch(/--card-deck-item-max-width:\s*425px;/);
    });

    it('keeps smartphone cards six pixels from the viewport edges', () => {
        expect(permissionsStyles).toMatch(
            /@media screen and \(max-width:\s*767px\)[\s\S]*--card-deck-mobile-padding:\s*0 6px;/,
        );
    });

    it('lets smartphone cards grow with their content instead of using internal card scrolling', () => {
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*\.chatTypeCard\s*{/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*width:\s*100%;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*min-width:\s*0;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*min-height:\s*auto;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*max-height:\s*none;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*overflow:\s*visible;/);
    });
});
