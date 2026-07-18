import type { Meta, StoryObj } from '@storybook/react-vite';
import { TourOverviewCarousel } from './TourOverviewCarousel';
import { adminDemoTour } from './tourDefinitions';
import type { TutorialProgressItem } from '../../api/tutorial/getTutorialProgress';

type ProgressFixture = Pick<TutorialProgressItem, 'tourId' | 'tourVersion' | 'status' | 'currentStepId'>[];

const secondTour = {
    ...adminDemoTour,
    id: 'admin-permissions-tour',
    titleKey: 'productTour.adminTour.navigation.title',
    summaryKey: 'productTour.adminTour.navigation.content',
};

const meta = {
    title: 'Organisms/TourOverviewCarousel',
    component: TourOverviewCarousel,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=899-26642',
        },
        docs: {
            description: {
                component:
                    'Profile overview of the tutorials available to the signed-in admin: versioned progress state and a Start/Continue/Restart action per tour. Production ships no admin tour yet, so the live card shows the empty state.',
            },
        },
    },
    args: {
        tours: [adminDemoTour],
        audience: 'tenant_admin',
        loadProgress: () => Promise.resolve([]),
        onStartTour: () => {},
    },
} satisfies Meta<typeof TourOverviewCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};

export const MixedStatuses: Story = {
    args: {
        tours: [adminDemoTour, secondTour],
        loadProgress: () =>
            Promise.resolve<ProgressFixture>([
                {
                    tourId: 'admin-demo-tour',
                    tourVersion: 1,
                    status: 'completed',
                },
                {
                    tourId: 'admin-permissions-tour',
                    tourVersion: 1,
                    status: 'in_progress',
                    currentStepId: 'navigation',
                },
            ]),
    },
};

export const NewTourVersionOffersRestartAsFresh: Story = {
    args: {
        tours: [{ ...adminDemoTour, version: 2 }],
        loadProgress: () =>
            Promise.resolve<ProgressFixture>([
                {
                    tourId: 'admin-demo-tour',
                    tourVersion: 1,
                    status: 'completed',
                },
            ]),
    },
    parameters: {
        docs: {
            description: {
                story: 'A newer tour version is a fresh progress scope: the completed v1 progress does not mark v2 as completed.',
            },
        },
    },
};

export const EmptyProductionState: Story = {
    args: {
        tours: [],
        loadProgress: () => Promise.resolve([]),
    },
};

export const MobileViewport: Story = {
    args: {
        tours: [adminDemoTour, secondTour],
        loadProgress: () =>
            Promise.resolve<ProgressFixture>([
                {
                    tourId: 'admin-demo-tour',
                    tourVersion: 1,
                    status: 'skipped',
                },
            ]),
    },
    globals: { viewport: { value: 'mobile1', isRotated: false } },
};
