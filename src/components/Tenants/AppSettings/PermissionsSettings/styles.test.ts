import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const permissionsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const caseHandoverCardView = readFileSync(resolve(__dirname, './CaseHandoverCard/CaseHandoverCardView.tsx'), 'utf8');

describe('PermissionsSettings responsive card contract', () => {
    it('lets smartphone cards grow with their content instead of using internal card scrolling', () => {
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*\.chatTypeCard\s*{/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*width:\s*100%;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*min-width:\s*0;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*min-height:\s*auto;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*max-height:\s*none;/);
        expect(permissionsStyles).toMatch(/@media screen and \(max-width:\s*767px\)[\s\S]*overflow:\s*visible;/);
    });

    it('keeps a rule for every shared class the case-handover card uses', () => {
        const classNames = [...caseHandoverCardView.matchAll(/cardStyles\.(\w+)/g)].map(([, name]) => name);

        expect(classNames).toContain('toggleRow');
        classNames.forEach((name) => expect(permissionsStyles).toMatch(new RegExp(`\\.${name}\\s*{`)));
    });
});
