import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicLayout = readFileSync(resolve(__dirname, '../../styles/components/publicLayout.less'), 'utf8');
const stage = readFileSync(resolve(__dirname, '../../styles/components/stage.less'), 'utf8');
const app = readFileSync(resolve(__dirname, '../../styles/App.less'), 'utf8');

/**
 * jsdom computes no layout, so the scroll behaviour that made the tenant-admin
 * onboarding page unusable at 390x844 (#569) is asserted on the stylesheets:
 * the document is deliberately scroll-locked by the app shell, therefore the
 * public layout has to be a scroll container itself.
 */
describe('public page scrolling', () => {
    it('still locks document scrolling in the app shell', () => {
        // Guard for the rule below: if this ever changes, the .publicLayout
        // scroll container may become redundant instead of load-bearing.
        expect(app).toMatch(/html,\s*\n?body\s*{[\s\S]*?overflow:\s*hidden/);
    });

    it('bounds the public layout to the viewport and lets it scroll itself', () => {
        const rule = publicLayout.match(/\n\.publicLayout\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(rule).toMatch(/max-height:\s*100vh/);
        expect(rule).toMatch(/min-height:\s*100vh/);
        expect(rule).toMatch(/overflow-y:\s*auto/);
    });

    it('keeps the content from shrinking back into the viewport instead of scrolling', () => {
        // antd's `flex: auto` on the content would otherwise squash a tall page
        // to viewport height and let it spill across the footer.
        const rule = publicLayout.match(/\n\.publicLayout\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        const contentRule = rule.match(/>\s*\.publicContent\s*{([\s\S]*?)\n {4}}/)?.[1] ?? '';

        expect(contentRule).toMatch(/flex:\s*1 0 auto/);
        expect(rule).toMatch(/>\s*\.layoutFooter\s*{[\s\S]*?flex-shrink:\s*0/);
    });

    it('keeps the branding stage off small screens when it is rendered as a side panel', () => {
        const rule = stage.match(/\n\.stage--panel\s*{([\s\S]*?)\n}\n/)?.[1] ?? '';

        expect(rule).toMatch(/display:\s*none/);
        expect(rule).toMatch(/animation:\s*none/);
        // Only from xl up, where the form column sits clear of the 40vw panel.
        expect(rule).toMatch(/@media screen and \(min-width: @screen-xl\)[\s\S]*display:\s*flex/);
    });
});
