import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const editorStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const sharedStatusTag = readFileSync(resolve(__dirname, '../../../../../styles/_statusTag.scss'), 'utf8');
const appCss = readFileSync(resolve(__dirname, '../../../../../app.css'), 'utf8');

const rule = (source: string, selector: string) =>
    source.match(new RegExp(`${selector.replace('.', '\\.')}\\s*{([^}]*)}`, 's'))?.[1] ?? '';

describe('DPIA editor status tag contract', () => {
    it('paints the status tags from the token scale instead of antd colour presets', () => {
        // antd's `color="green"` renders #389e0d on #f6ffed = 3.37:1 at the tag's
        // 12px, below WCAG 1.4.3's 4.5:1; `color="orange"` fails the same way.
        expect(editorStyles).toMatch(/\.statusTag\b/);
        expect(editorStyles).toMatch(/\.statusTagPublished\b/);
        expect(editorStyles).toMatch(/\.statusTagUnsaved\b/);
    });

    it('keeps the neutral tag on the seed-independent surface roles', () => {
        const neutral = rule(sharedStatusTag, '@mixin status-tag');

        expect(neutral).toMatch(/--m3-surface-container-high/);
        expect(neutral).toMatch(/--m3-on-surface-variant/);
        expect(neutral).toMatch(/--m3-outline-variant/);
    });

    it('uses the readable on-container foregrounds for published and unsaved', () => {
        expect(rule(sharedStatusTag, '@mixin status-tag-published')).toMatch(/--admin-status-success-on-container/);
        expect(rule(sharedStatusTag, '@mixin status-tag-unsaved')).toMatch(/--admin-status-warning-on-container/);
    });

    it('defines those foregrounds next to their status siblings in app.css', () => {
        expect(appCss).toMatch(/--admin-status-success-on-container:/);
        expect(appCss).toMatch(/--admin-status-warning-container:/);
        expect(appCss).toMatch(/--admin-status-warning-on-container:/);
    });
});
