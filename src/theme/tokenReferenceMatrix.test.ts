import { describe, expect, it } from 'vite-plus/test';
import { theme as antdTheme } from 'antd';

import * as inspectionStories from './appliedTokenInspection.stories';
import { buildAdminAntdTheme } from './antdM3Theme';
import { computeOrisoPalette } from '../utils/theme/orisoScheme';
import { tokenReferenceCases, tokenReferenceContexts, tokenReferenceObservationIds } from './tokenReferenceMatrix';

const hex = (value: string) => value.trim().toLowerCase();

describe('applied token reference matrix manifest (frozen; no second values list)', () => {
    it('freezes exactly 2 brandings x 2 schemes x 2 languages for 2 references = 16 cases', () => {
        expect(Object.isFrozen(tokenReferenceContexts)).toBe(true);
        expect(Object.isFrozen(tokenReferenceCases)).toBe(true);
        expect(tokenReferenceContexts).toHaveLength(8);
        expect(new Set(tokenReferenceContexts.map(({ primaryColor }) => primaryColor))).toEqual(
            new Set(['#A5000A', '#1D4ED8']),
        );
        expect(new Set(tokenReferenceContexts.map(({ scheme }) => scheme))).toEqual(new Set(['light', 'inverted']));
        expect(new Set(tokenReferenceContexts.map(({ locale }) => locale))).toEqual(new Set(['de', 'en']));
        expect(tokenReferenceCases).toHaveLength(16);
        expect(new Set(tokenReferenceCases.map(({ storyName }) => storyName)).size).toBe(16);
        expect(tokenReferenceCases.filter(({ reference }) => reference === 'field')).toHaveLength(8);
        expect(tokenReferenceCases.filter(({ reference }) => reference === 'bridge')).toHaveLength(8);
    });

    it('has exactly one Storybook story per manifest case and no unlisted contract story', () => {
        const exports: Record<string, unknown> = { ...inspectionStories };
        delete exports.default;
        const manifestNames = tokenReferenceCases.map(({ storyName }) => storyName);
        const unlisted = Object.keys(exports).filter(
            (name) =>
                !manifestNames.includes(name) &&
                ![
                    'ComponentOverrideAndRestore',
                    'MissingEffectiveRootAndRestore',
                    'UnresolvedAuthoredRootAndRestore',
                ].includes(name) &&
                !name.startsWith('InspectionStaysResponsive'),
        );
        expect(unlisted).toEqual([]);
        manifestNames.forEach((name) => expect(Object.keys(exports), `Missing story ${name}`).toContain(name));
    });

    it('names the observations each reference must report, derived from the real palette', () => {
        tokenReferenceContexts.forEach((context) => {
            const { tokens } = computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme);
            const fieldPalette = Object.keys(tokens)
                .filter((name) => name.startsWith('--admin-field-'))
                .map((name) => `palette:${name}`);
            expect(tokenReferenceObservationIds.field.filter((id) => id.startsWith('palette:'))).toEqual(fieldPalette);
        });
        expect(tokenReferenceObservationIds.bridge).toEqual([
            'palette:--m3-primary',
            'component:bridge-primary-button:background-color',
        ]);
        expect(tokenReferenceObservationIds.field).toEqual(
            expect.arrayContaining([
                'component:field-input:background-color',
                'component:field-input:font-size',
                'component:field-input:font-family',
                'component:field-input:border-radius',
                'component:field-input:height',
                'component:field-workspace:gap',
            ]),
        );
    });

    it('pins the known inverted-theme baseline difference to the contexts where the product really derives a different primary', () => {
        tokenReferenceCases
            .filter(({ reference }) => reference === 'bridge')
            .forEach(({ context, expectedPrimaryButton, storyName }) => {
                const expected = computeOrisoPalette({ accentDark: context.primaryColor }, context.scheme).tokens[
                    '--m3-primary'
                ];
                const resolved = antdTheme.getDesignToken(
                    buildAdminAntdTheme({ seeds: { accentDark: context.primaryColor }, scheme: context.scheme }),
                ).colorPrimary;
                expect(expectedPrimaryButton, storyName).toBe(hex(expected) === hex(resolved) ? 'match' : 'mismatch');
            });
    });

    it('expects every field case to match, so a regression in any field token is a failure, not a new baseline', () => {
        tokenReferenceCases
            .filter(({ reference }) => reference === 'field')
            .forEach((entry) => expect(entry.expectedPrimaryButton, entry.storyName).toBeNull());
    });
});
