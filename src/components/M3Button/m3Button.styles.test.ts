import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const moduleStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

/*
 * Disabled contract of the shared M3 button.
 *
 * Before this file existed the rule was a single blanket
 * `.button:disabled { opacity: 0.38 }`. That fades the WHOLE control,
 * container included, so a disabled `filled` button rendered as the primary
 * red at 38% — a washed-out pink pill — and `tonal` as a washed-out slate.
 *
 * Material 3 specifies the opposite: a disabled filled or tonal button is a
 * NEUTRAL container, `on-surface` at 12%, with its label at `on-surface` 38%.
 * The brand colour must not survive into the disabled state at all.
 *
 * This became owner-visible on the admin sign-in form: PR #839 moved
 * `src/pages/Login/LoginForm.tsx` from a raw MUI `<Button variant="contained">`
 * to `<M3Button variant="filled" block>`, and the login page's INITIAL state is
 * the disabled state — so the faded pink pill was the first thing anyone saw.
 * `src/pages/TenantOnboarding/AccountStep.tsx` ships the same treatment via
 * `disabled={busy}`.
 *
 * If an assertion here goes red, that pill is back. Read this comment and the
 * PR that introduced the assertion before deleting it.
 */
describe('M3Button — disabled treatment (M3 neutral container, not faded brand)', () => {
    it('does not fade the whole control with a blanket opacity', () => {
        const blockRule = moduleStyles.match(/\.button:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(blockRule).not.toMatch(/opacity/);
    });

    it('keeps the not-allowed cursor on every disabled variant', () => {
        const blockRule = moduleStyles.match(/\.button:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(blockRule).toMatch(/cursor:\s*not-allowed/);
    });

    it('gives a disabled filled button a neutral 12% container and a 38% label', () => {
        const rule = moduleStyles.match(/\.filled:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(rule).toMatch(/--m3-on-surface/);
        expect(rule).toMatch(/12%/);
        expect(rule).toMatch(/38%/);
        // The brand colour must not survive into the disabled state.
        expect(rule).not.toMatch(/--m3-primary/);
    });

    it('gives a disabled tonal button the same neutral treatment', () => {
        const rule = moduleStyles.match(/\.tonal:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(rule).toMatch(/--m3-on-surface/);
        expect(rule).toMatch(/12%/);
        expect(rule).toMatch(/38%/);
        expect(rule).not.toMatch(/--m3-secondary-container/);
    });

    it('fades only the label on text and outlined — they have no filled container to neutralise', () => {
        const textRule = moduleStyles.match(/\.text:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(textRule).toMatch(/38%/);
        expect(textRule).not.toMatch(/background:/);

        const outlinedRule = moduleStyles.match(/\.outlined:disabled\s*\{[^}]*\}/)?.[0] ?? '';
        expect(outlinedRule).toMatch(/38%/);
        // M3 dims the outline too, at 12%.
        expect(outlinedRule).toMatch(/12%/);
    });
});
