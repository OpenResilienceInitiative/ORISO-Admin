import { readdirSync, readFileSync } from 'node:fs';
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
        expect(appCss).toContain('):not(.ProseMirror, .PrivateSwitchBase-input):focus-visible');
        expect(appCss).toMatch(/\.MuiRadio-root, \.MuiCheckbox-root\)\.Mui-focusVisible/);
    });

    it.each([
        '../components/EditButton/styles.module.scss',
        '../components/M3Switch/styles.module.scss',
        '../components/TopicCatalogue/styles.module.scss',
    ])('%s draws no ring of its own colour', (path) => {
        expect(read(path)).not.toMatch(/outline:\s*\d+px solid #[0-9a-f]{3,6}/i);
    });

    it('lets a component move the ring by setting the offset token, because the shared rule is more specific', () => {
        // The shared rule (0,4,0) beats a component's own `outline-offset`; only the token survives it.
        const editor = read('../components/FormPluginEditor/M3RichTextEditor.module.scss');
        const cue = editor.slice(editor.indexOf('.functionBarScrollCue {'));
        expect(cue.slice(0, cue.indexOf('}\n\n.functionBarScrollCueLeft'))).toMatch(
            /--admin-focus-ring-offset:\s*-2px;/,
        );
    });

    it('lets surfaces that follow the colour scheme or stay dark set their own ring colour', () => {
        // The dialog card follows the scheme through the contrast-checked runtime token (#1168).
        expect(read('../components/Card/styles.module.scss')).toMatch(
            /--admin-focus-ring-color:\s*var\(--admin-focus-ring-on-surface,\s*var\(--m3-primary/,
        );
        // The editor hints are the shared pop-up now: it stays dark in every scheme and takes its ring from the
        // text colour of its own tone, a pair built to be readable on the container.
        expect(read('../components/Snackbar/Snackbar.module.scss')).toMatch(
            /--snackbar-focus:\s*var\(--snackbar-on-container\)/,
        );
    });

    // #1168: --m3-primary is the Träger seed at runtime, so a ring drawn in it fades for pale brand colours.
    it('draws no outline in the raw Träger colour anywhere in the styles', () => {
        const src = resolve(__dirname, '..');
        const offenders = (readdirSync(src, { recursive: true }) as string[])
            .filter((file) => /\.(s?css|less)$/.test(file))
            .flatMap((file) =>
                readFileSync(resolve(src, file), 'utf8')
                    .split('\n')
                    .map((line, index) => ({ line: line.trim(), at: `${file}:${index + 1}` }))
                    .filter(({ line }) => /^outline(-color)?\s*:.*var\(--m3-primary\b/.test(line))
                    .map(({ at }) => at),
            );

        expect(offenders).toEqual([]);
    });
});
