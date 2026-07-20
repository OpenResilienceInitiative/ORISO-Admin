import type { TourDefinition } from './types';

/**
 * Representative Admin tour for Storybook review only. Concrete Admin tours
 * are enabled in production only after their content and target flow are
 * separately accepted (epic decision — see the TOUR-02 sub-issue).
 */
export const adminDemoTour: TourDefinition = {
    id: 'admin-demo-tour',
    version: 1,
    surface: 'admin',
    audiences: ['tenant_admin', 'platform_admin'],
    titleKey: 'productTour.adminTour.title',
    summaryKey: 'productTour.adminTour.summary',
    steps: [
        {
            id: 'welcome',
            target: '',
            placement: 'center',
            titleKey: 'productTour.adminTour.welcome.title',
            contentKey: 'productTour.adminTour.welcome.content',
        },
        {
            id: 'navigation',
            target: 'admin-navigation',
            placement: 'right',
            titleKey: 'productTour.adminTour.navigation.title',
            contentKey: 'productTour.adminTour.navigation.content',
        },
    ],
};

/** Tours enabled in the running admin app: none in this package. */
export const adminTours: TourDefinition[] = [];
