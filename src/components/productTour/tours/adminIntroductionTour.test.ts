import { describe, expect, it } from 'vite-plus/test';
import translationDe from '../../../locales/de/translation.json';
import translationEn from '../../../locales/en/translation.json';
import routePathNames from '../../../appConfig';
import { adminIntroductionTour } from './adminIntroductionTour';
import { adminTours } from '../tourDefinitions';

const de = translationDe as Record<string, string>;
const en = translationEn as Record<string, string>;

describe('admin-introduction tour', () => {
    it('keeps the fixed id, version, surface and audiences the progress allowlist expects', () => {
        expect(adminIntroductionTour).toMatchObject({
            id: 'admin-introduction',
            version: 1,
            surface: 'admin',
            audiences: ['agency_admin', 'tenant_admin', 'platform_admin'],
        });
    });

    it('is enabled in the running admin app', () => {
        expect(adminTours).toContain(adminIntroductionTour);
    });

    it('walks the sidebar in the agreed order', () => {
        expect(adminIntroductionTour.steps.map((step) => step.target)).toEqual([
            '',
            'admin-navigation',
            'admin-nav-theme',
            'admin-nav-tenants',
            'admin-nav-agency',
            'admin-nav-counselors',
            'admin-nav-links',
            'admin-nav-account',
            '',
        ]);
    });

    it('starts centred on the home page and ends centred', () => {
        const [first] = adminIntroductionTour.steps;
        const last = adminIntroductionTour.steps[adminIntroductionTour.steps.length - 1];
        expect(first).toMatchObject({ route: routePathNames.home, placement: 'center' });
        expect(last).toMatchObject({ target: '', placement: 'center' });
    });

    it('marks every anchored step optional, so the tour completes on a phone and for every role', () => {
        adminIntroductionTour.steps
            .filter((step) => step.target)
            .forEach((step) => expect(step.optional, step.id).toBe(true));
    });

    it('is watch-only: no step carries an action trigger', () => {
        adminIntroductionTour.steps.forEach((step) => expect(Object.keys(step)).not.toContain('advanceOn'));
    });

    it('has German and English texts for every key', () => {
        const keys = [
            adminIntroductionTour.titleKey,
            adminIntroductionTour.summaryKey,
            ...adminIntroductionTour.steps.flatMap((step) => [step.titleKey, step.contentKey]),
        ];
        keys.forEach((key) => {
            expect(de[key], `missing DE key ${key}`).toEqual(expect.any(String));
            expect(en[key], `missing EN key ${key}`).toEqual(expect.any(String));
            expect(de[key].trim(), `empty DE key ${key}`).not.toBe('');
        });
    });

    it('addresses the reader formally in German', () => {
        adminIntroductionTour.steps.forEach((step) => {
            expect(de[step.contentKey], step.id).not.toMatch(/\b(du|dich|dir|dein\w*)\b/i);
        });
    });
});
