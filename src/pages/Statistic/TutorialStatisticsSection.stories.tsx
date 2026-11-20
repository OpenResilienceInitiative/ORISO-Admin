import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, within } from 'storybook/test';
import { TutorialStatisticsSection } from './TutorialStatisticsSection';
import { FETCH_ERRORS } from '../../api/fetchData';
import type { TutorialStatisticsResponse } from '../../api/statistic/getTutorialStatistics';

const tenantResponse: TutorialStatisticsResponse = {
    generatedAt: '2026-07-19T10:00:00Z',
    scope: 'TENANT',
    tenants: [
        {
            tenantId: 2,
            counts: [
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 1,
                    status: 'completed',
                    total: 18,
                },
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 1,
                    status: 'in_progress',
                    total: 7,
                },
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 1,
                    status: 'skipped',
                    total: 3,
                },
                {
                    surface: 'admin',
                    tourId: 'admin-demo-tour',
                    tourVersion: 1,
                    status: 'completed',
                    total: 2,
                },
            ],
        },
    ],
};

const platformResponse: TutorialStatisticsResponse = {
    ...tenantResponse,
    scope: 'PLATFORM',
    tenants: [
        ...tenantResponse.tenants,
        {
            tenantId: 3,
            counts: [
                {
                    surface: 'frontend',
                    tourId: 'consultant-walkthrough',
                    tourVersion: 2,
                    status: 'not_started',
                    total: 11,
                },
            ],
        },
    ],
};

const meta = {
    title: 'Organisms/TutorialStatisticsSection',
    component: TutorialStatisticsSection,
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
                    'Aggregate tutorial-completion dashboard section (epic TOUR-07). Backend scoping is authoritative: tenant admins see only their tenant, platform admins global counts per tenant. 403 and API failures render as real in-place states — never as an empty-success table. The API contract contains no per-user records.',
            },
        },
    },
    args: {
        loadStatistics: () => Promise.resolve(tenantResponse),
    },
} satisfies Meta<typeof TutorialStatisticsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TenantScope: Story = {};

export const PlatformScopeWithTenantColumn: Story = {
    args: {
        loadStatistics: () => Promise.resolve(platformResponse),
    },
};

export const Empty: Story = {
    args: {
        loadStatistics: () => Promise.resolve({ generatedAt: '2026-07-19T10:00:00Z', scope: 'TENANT', tenants: [] }),
    },
};

export const Loading: Story = {
    args: {
        loadStatistics: () => new Promise<TutorialStatisticsResponse>(() => {}),
    },
};

export const Unauthorized: Story = {
    args: {
        loadStatistics: () => Promise.reject(new Error(FETCH_ERRORS.FORBIDDEN)),
    },
};

export const LoadError: Story = {
    args: {
        loadStatistics: () => Promise.reject(new Error('API call error: 500')),
    },
};

export const HiddenGroup: Story = {
    args: {
        loadStatistics: () =>
            Promise.resolve({
                ...tenantResponse,
                smallCellMinimum: 5,
                tenants: [
                    {
                        tenantId: 2,
                        counts: [
                            {
                                surface: 'frontend',
                                tourId: 'consultant-walkthrough',
                                tourVersion: 1,
                                status: null,
                                total: 0,
                                suppressed: true,
                            },
                            ...tenantResponse.tenants[0].counts.filter((count) => count.surface === 'admin'),
                        ],
                    },
                ],
            }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(/Ausgeblendet: weniger als 5 Personen/)).toBeVisible();
        // the shown group keeps its figures, the hidden one has no zero and no percentage
        await expect(canvas.getAllByText('100%')).toHaveLength(1);
        await expect(canvas.queryByText('0%')).toBeNull();
    },
};
