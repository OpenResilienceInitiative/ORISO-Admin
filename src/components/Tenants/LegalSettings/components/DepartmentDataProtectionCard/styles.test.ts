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

    it('paints the status chip from status tokens, with no literal colour', () => {
        const base = cardStyles.match(/\.statusTag\s*{([^}]*)}/s)?.[1] ?? '';
        const published = cardStyles.match(/\.statusTagPublished\s*{([^}]*)}/s)?.[1] ?? '';

        // Neutral base = the same M3 surface pair the sibling LegalDraftNotice uses.
        expect(base).toMatch(/background:\s*var\(--m3-surface-container-high/);
        expect(base).toMatch(/color:\s*var\(--m3-on-surface-variant/);

        // Published = the success family, incl. the on-container pair that carries
        // the 4.5:1 the raw success green cannot at 12px.
        expect(published).toMatch(/background:\s*var\(--admin-status-success-container/);
        expect(published).toMatch(/color:\s*var\(--admin-status-success-on-container/);

        // Every declared colour is a token lookup; hexes appear only as var() fallbacks.
        [...base.matchAll(/(?:^|\n)\s*(?:background|color|border(?:-color)?):\s*([^;]+);/g)].forEach(([, value]) =>
            expect(value).toMatch(/var\(--/),
        );
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
