import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const appCss = read('../app.css');

/** D13: one keyboard focus ring for every control, drawn from one token. */
describe('shared focus ring', () => {
    it('defines the ring token on :root with the fixed brand accent (7.7:1 on the light workspace)', () => {
        expect(appCss).toMatch(/--admin-focus-ring-color:\s*var\(--oriso-app-accent-dark,\s*#a5000a\)/);
    });

    it('has one :focus-visible rule that also covers MUI and antd buttons and the editors', () => {
        const rule = appCss.slice(appCss.indexOf('THE keyboard focus ring'));
        expect(rule).toContain('.MuiButtonBase-root');
        expect(rule).toContain('.ant-btn');
        expect(rule).toContain("[contenteditable='true']");
        expect(rule).toMatch(/outline:\s*var\(--admin-focus-ring-width\) solid var\(--admin-focus-ring-color\)/);
    });

    it('draws the switch ring around the whole switch, not on the track, and one ring on the editor surface', () => {
        expect(read('../components/mui/MuiSwitchField/styles.module.scss')).toMatch(
            /\.switch:has\(:global\(\.Mui-focusVisible\)\)\s*\{[^}]*outline:/,
        );
        // The rich-text surface draws its own single ring on the container; the text node must not add a second one.
        expect(appCss).toContain('):not(.ProseMirror):focus-visible');
        expect(appCss).toMatch(/\.MuiRadio-root, \.MuiCheckbox-root\)\.Mui-focusVisible/);
    });

    it.each(['../components/EditButton/styles.module.scss', '../components/M3Switch/styles.module.scss'])(
        '%s draws no ring of its own colour',
        (path) => {
            expect(read(path)).not.toMatch(/outline:\s*\d+px solid #[0-9a-f]{3,6}/i);
        },
    );

    it('lets surfaces that follow the colour scheme or stay dark set their own ring colour', () => {
        expect(read('../components/Card/styles.module.scss')).toMatch(/--admin-focus-ring-color:\s*var\(--m3-primary/);
        expect(read('../components/FormPluginEditor/M3RichTextEditor.module.scss')).toMatch(
            /--admin-focus-ring-color:\s*#ffb4aa/,
        );
    });
});
