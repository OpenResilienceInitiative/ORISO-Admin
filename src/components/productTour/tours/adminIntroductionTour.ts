import type { TourDefinition, TourStep } from '../types';

const stepKeys = (stepId: string): Pick<TourStep, 'titleKey' | 'contentKey'> => ({
    titleKey: `productTour.adminIntroduction.step.${stepId}.title`,
    contentKey: `productTour.adminIntroduction.step.${stepId}.content`,
});

/** A desktop-sidebar destination; every one depends on role and layout, so it is optional. */
const navStep = (id: string, target: string): TourStep => ({
    id,
    target,
    placement: 'right',
    optional: true,
    ...stepKeys(id),
});

/**
 * Admin introduction (use-case tours plan, section 4). Watch-only: driven by
 * "Weiter", no step performs an action. The sidebar exists on desktop only
 * (phones use AdminMobileNavBar), and each destination depends on the role,
 * so every anchored step is optional and the tour completes on any account.
 */
export const adminIntroductionTour: TourDefinition = {
    id: 'admin-introduction',
    version: 1,
    surface: 'admin',
    audiences: ['agency_admin', 'tenant_admin', 'platform_admin'],
    titleKey: 'productTour.adminIntroduction.title',
    summaryKey: 'productTour.adminIntroduction.summary',
    steps: [
        { id: 'welcome', route: '/admin/home', target: '', placement: 'center', ...stepKeys('welcome') },
        navStep('navigation', 'admin-navigation'),
        navStep('settings', 'admin-nav-theme'),
        navStep('tenants', 'admin-nav-tenants'),
        navStep('agencies', 'admin-nav-agency'),
        navStep('accounts', 'admin-nav-counselors'),
        navStep('linksStatisticsLogs', 'admin-nav-links'),
        navStep('account', 'admin-nav-account'),
        { id: 'done', target: '', placement: 'center', ...stepKeys('done') },
    ],
};
