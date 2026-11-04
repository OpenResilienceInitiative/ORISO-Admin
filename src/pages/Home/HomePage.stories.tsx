import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { USER_DATA_KEY } from '../../hooks/useUserData.hook';
import { setStoryAuth, withSeededAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { HomePage } from './HomePage';

/** Counts as `useHomeFacts` caches them; a story needs no network. */
const seedFacts = (facts: Record<string, unknown>) => (client: QueryClient) => {
    client.setQueryData([USER_DATA_KEY], { firstName: 'Kim' });
    Object.entries(facts).forEach(([key, value]) => client.setQueryData(['HOME_FACT', key], value));
};

const meta = {
    title: 'Pages/Home',
    component: HomePage,
    parameters: {
        layout: 'fullscreen',
        // Requests the page and its providers make on mount; without them the
        // global error toast covers the greeting.
        msw: {
            handlers: [
                http.get('*/service/users/data', () => HttpResponse.json({ firstName: 'Kim' })),
                http.get('*/service/tenant/public/*', () => HttpResponse.json({ id: 1, name: 'Demo', settings: {} })),
            ],
        },
    },
} satisfies Meta<typeof HomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform admin at the very start: no Träger yet, so the checklist leads. */
export const PlatformAdminFirstLogin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0);
            return withSeededAdminProviders(
                Story,
                seedFacts({
                    tenants: 0,
                    agencies: 0,
                    consultants: 0,
                    'invites-tenant': { PREPARED: 0 },
                    'invites-unit': { INVITED: 2 },
                }),
            );
        },
    ],
};

/** Träger admin (usual role bundle) halfway through: one Beratungsstelle, invitations out, one stuck. */
export const TraegerAdmin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin], 7);
            return withSeededAdminProviders(
                Story,
                seedFacts({
                    agencies: 1,
                    consultants: 0,
                    'invites-unit': { INVITED: 3, NEEDS_ACTION: 1, DONE: 0 },
                }),
            );
        },
    ],
};

/** Beratungsstellen admin: their agency, invitations, nothing from Träger level. */
export const BeratungsstellenAdmin: Story = {
    decorators: [
        (Story) => {
            setStoryAuth([UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin], 7);
            return withSeededAdminProviders(Story, seedFacts({ agencies: 1, consultants: 4 }));
        },
    ],
};
