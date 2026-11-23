import { describe, expect, it } from 'vite-plus/test';
import { contrastRatio } from '../contrastRatio';
import { computeOrisoPalette, type AdminContrast } from './orisoScheme';

describe('Admin personal contrast', () => {
    it.each([
        ['medium', 5.5],
        ['high', 7],
    ] as const)(
        '%s resolves field and dialog roles for light, dark and varied branding',
        (level: AdminContrast, minimum) => {
            const fixtures = [{}, { primary: '#b4ddee', accent: '#f2d16b' }, { primary: '#777777', accent: '#888888' }];
            fixtures.forEach((seeds) => {
                (['light', 'dark'] as const).forEach((scheme) => {
                    const { tokens } = computeOrisoPalette(seeds, scheme, level);
                    const standard = computeOrisoPalette(seeds, scheme, 'standard').tokens;
                    expect(computeOrisoPalette(seeds, scheme).tokens).toEqual(standard);
                    const unchangedRoles = [
                        '--m3-on-background',
                        '--m3-surface',
                        '--admin-form-card-surface',
                        '--admin-field-surface',
                        '--admin-workspace-background',
                    ];
                    unchangedRoles.forEach((role) => expect(tokens[role], role).toBe(standard[role]));
                    const check = (ink: string, fill: string, threshold = minimum) =>
                        expect(
                            contrastRatio(tokens[ink], tokens[fill]),
                            `${scheme} ${ink} / ${fill}`,
                        ).toBeGreaterThanOrEqual(threshold);
                    check('--m3-on-surface', '--admin-form-card-surface');
                    check('--m3-on-surface-variant', '--admin-form-card-surface');
                    check('--admin-link-text', '--admin-form-card-surface');
                    check('--admin-form-field-text', '--admin-field-surface');
                    check('--admin-form-label-text', '--admin-form-card-surface');
                    check('--admin-field-selected-text', '--admin-field-selected-surface');
                    check('--admin-field-outline', '--admin-field-surface', 3);
                    check('--admin-field-outline', '--admin-form-card-surface', 3);
                    check('--admin-field-focus', '--admin-form-card-surface', 3);
                });
                expect(computeOrisoPalette(seeds, 'inverted', level)).toEqual(computeOrisoPalette(seeds, 'inverted'));
            });
        },
    );
});
