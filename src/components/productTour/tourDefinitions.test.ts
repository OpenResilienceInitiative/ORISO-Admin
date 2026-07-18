import { describe, expect, it } from 'vitest';
import translationDe from '../../locales/de/translation.json';
import translationEn from '../../locales/en/translation.json';
import { adminDemoTour, adminTours } from './tourDefinitions';

describe('admin tour definitions', () => {
    it('ships no production tour in this delivery package', () => {
        expect(adminTours).toEqual([]);
    });

    it('provides a representative demo tour for Storybook review only', () => {
        expect(adminDemoTour.surface).toBe('admin');
        expect(adminDemoTour.audiences).toContain('tenant_admin');
        expect(adminDemoTour.steps.length).toBeGreaterThanOrEqual(2);
    });

    it('uses only i18n keys that exist in both admin bundles (flat keys)', () => {
        const de = translationDe as Record<string, string>;
        const en = translationEn as Record<string, string>;
        const keys = [
            adminDemoTour.titleKey,
            adminDemoTour.summaryKey,
            ...adminDemoTour.steps.flatMap((step) => [
                step.titleKey,
                step.contentKey,
            ]),
        ];
        keys.forEach((key) => {
            expect(typeof de[key], `missing DE key ${key}`).toBe('string');
            expect(typeof en[key], `missing EN key ${key}`).toBe('string');
        });
    });
});
