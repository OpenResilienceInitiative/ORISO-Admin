import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const editorStyles = readFileSync(
    resolve(__dirname, '../../../../FormPluginEditor/M3RichTextEditor.module.scss'),
    'utf8',
);

describe('DepartmentDataProtectionCard responsive contract', () => {
    it('shrinks with its container while retaining the desktop maximum', () => {
        const cardRule = cardStyles.match(/\.card\s*{([^}]*)}/s)?.[1] ?? '';

        expect(cardRule).toMatch(/width:\s*100%/);
        expect(cardRule).toMatch(/min-width:\s*0/);
        expect(cardRule).toMatch(/max-width:\s*960px/);
        expect(cardRule).toMatch(/box-sizing:\s*border-box/);
        expect(cardRule).not.toMatch(/min-width:\s*375px/);
    });

    it('shows a compact scrollbar cue for the overflowing toolbar on mobile', () => {
        const mobileRule = editorStyles
            .match(/@media \(max-width:\s*599px\)\s*{([\s\S]*?)\n}/g)
            ?.find((rule) => rule.includes('.toolbarScroll'));

        expect(mobileRule).toMatch(/\.toolbarScroll\s*{[\s\S]*scrollbar-width:\s*thin/);
        expect(mobileRule).toMatch(/&::-webkit-scrollbar\s*{[\s\S]*height:\s*4px/);
        expect(mobileRule).toMatch(/&::-webkit-scrollbar-thumb\s*{[\s\S]*background:/);
    });
});
