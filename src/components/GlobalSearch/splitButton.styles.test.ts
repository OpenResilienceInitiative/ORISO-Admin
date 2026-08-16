import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './splitButton.module.scss'), 'utf8');

/*
 * ORISO-Admin#741 — "Elevation is a state, not a skin" (owner call): a split
 * button at REST must not carry a shadow. Box-shadows are only legal in the
 * `.open` state and on the `elevated` variant, whose spec identity is the
 * resting shadow (Figma 57994-15744, Style=Elevated). This guards against the
 * resting-shadow regression Frank flagged on the template picker.
 */
describe('SplitButton style contract (#741, Figma 57994-15744)', () => {
    it('keeps every box-shadow scoped to .open, .elevated or the menu overlay', () => {
        const offenders = [...source.matchAll(/^([^{}]+?)\s*\{[^{}]*box-shadow[^{}]*\}/gms)]
            .map(([, sel]) => sel.trim())
            .filter((sel) => !/\.open|\.elevated|\.menuOverlay|ant-dropdown-menu/.test(sel));
        expect(offenders).toEqual([]);
    });

    it('the base segment rule carries no box-shadow (no elevated look at rest)', () => {
        const segment = source.match(/^\.segment\s*\{([^{}]*)\}/ms)?.[1] ?? '';
        expect(segment).not.toMatch(/box-shadow/);
    });

    it('flips the chevron up while open', () => {
        const open = source.match(/\.open\s+\.chevronIcon\s*\{([^{}]*)\}/ms)?.[1] ?? '';
        expect(open).toMatch(/rotate\(180deg\)/);
    });

    it('morphs the chevron segment to the fully rounded shape while open', () => {
        const open = source.match(/\.open\s+\.chevron\s*\{([^{}]*)\}/ms)?.[1] ?? '';
        expect(open).toMatch(/border-radius:\s*var\(--sb-radius\)/);
    });

    it('defines a pressed (:active) state layer and shape morph', () => {
        expect(source).toMatch(/\.segment:not\(:disabled\):active/);
        expect(source).toMatch(/\.main:not\(:disabled\):active/);
        expect(source).toMatch(/--sb-radius-pressed/);
    });

    it('defines the five spec sizes as classes', () => {
        ['.xsmall', '.small', '.medium', '.large', '.xlarge'].forEach((size) => {
            expect(source).toMatch(new RegExp(`^\\${size}\\s*\\{`, 'm'));
        });
    });

    it('keeps the sub-48px sizes touch-target compliant', () => {
        expect(source.match(/^\.xsmall\s*\{([^{}]*)\}/ms)?.[1]).toMatch(/--sb-touch-extend:\s*8px/);
        expect(source.match(/^\.small\s*\{([^{}]*)\}/ms)?.[1]).toMatch(/--sb-touch-extend:\s*4px/);
        // Either colon notation: the repo lints pseudo-elements to the single
        // colon it uses everywhere else, and `:before` === `::before` here.
        expect(source).toMatch(/\.segment::?before/);
    });
});
