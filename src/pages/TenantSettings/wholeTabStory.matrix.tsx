// eslint-disable-next-line import/no-extraneous-dependencies -- story fixture
import { http, HttpResponse } from 'msw';
import { appearanceHandlers } from '../../components/Tenants/GeneralSettings/components/appearanceStoryHarness.matrix';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../utils/storybook/adminStoryDecorators';

const tenant = {
    id: 1,
    name: 'Beispiel-Träger',
    settings: { activeLanguages: ['de', 'en'], tenantAdminControls: {} },
    content: { impressum: {}, privacy: {}, termsAndConditions: {}, claim: {} },
    licensing: {},
};

export const wholeTabHandlers = [
    http.get('*/service/agencyadmin/legal-proposal-distributions', () => HttpResponse.json([])),
    http.get('*/service/topic/', () => HttpResponse.json([])),
    http.get('*/service/useradmin/invitelinks', () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
    ),
    http.get('*/service/users/data', () => HttpResponse.json({ id: 'storybook-admin' })),
    http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/permission-policies', () => HttpResponse.json({ tenantId: 1, policies: {} })),
    http.put('*/service/tenantadmin/:id/permission-policies', async ({ request }) =>
        HttpResponse.json(await request.json()),
    ),
    http.get('*/service/tenantadmin/:id/dpa/status', () => HttpResponse.json({ tenantId: 1, status: 'MISSING' })),
    http.get('*/service/tenantadmin/:id/dpa/versions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/dpa/gate', () => HttpResponse.json({ dpaPublished: false, dpaSigned: false })),
    http.get('*/service/tenantadmin/:id/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-proposals', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-draft-archives', () => HttpResponse.json([])),
    http.get('*/service/tenantadmin/:id/legal-drafts/:type', () => HttpResponse.json(null)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
    http.put('*/service/tenantadmin/:id', async ({ request }) => HttpResponse.json(await request.json())),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    ...appearanceHandlers,
];
export const wholeTabBeforeEach = () => setStoryAuth([UserRole.TenantAdmin], 1);
export const wholeTabDecorators = [
    (Story: () => React.ReactElement) =>
        withSeededAdminProviders(Story, (client) => client.setQueryData(['tenant-data', 1], tenant)),
];
