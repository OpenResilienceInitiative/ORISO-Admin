import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { CounsellorInvitesTab, LinksPage, TenantInvitesTab } from './index';

// A factory, not a constant: a `Response` body can only be read once, so
// handing the same instance to a second request makes MSW throw
// "Failed to execute 'clone' on 'Response': Response body is already used".
const emptyList = () => HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });

/**
 * Full Links page shell — the pill tab row ("Träger-Invites" / "Berater-Invites" /
 * "Externe Inbounds") plus the "Mein Zugang" button — with the tenant invites tab
 * mounted as its outlet. Exists mainly to review header spacing and tab styling.
 */
const meta = {
    title: 'Organisms/Pages/Links/LinksPage',
    component: LinksPage,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [
                http.get('*/service/useradmin/account-invites', () => emptyList()),
                http.get('*/service/useradmin/invite-email-templates', () => HttpResponse.json([])),
                http.get('*/service/tenantadmin/search', () => HttpResponse.json({ total: 0, _embedded: [] })),
            ],
        },
    },
    decorators: [withAdminProviders],
} satisfies Meta<typeof LinksPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Wraps a story in the router shell the page needs: the global preview decorator already
 * provides a MemoryRouter (at '/'); a catch-all route mounts the page there and an index
 * route fills its Outlet, so the tab NavLinks render without a second (crashing) router.
 */
const withOutlet =
    (roles: UserRole[], tenantId: number, outlet: React.ReactElement) => (Story: () => React.ReactElement) => {
        setStoryAuth(roles, tenantId);
        return (
            <Routes>
                <Route path="*" element={<Story />}>
                    <Route index element={outlet} />
                </Route>
            </Routes>
        );
    };

/** Platform admin (tenantId 0): all three tabs — Träger-Invites, Berater-Invites, Externe Inbounds. */
export const PlatformAdmin: Story = {
    decorators: [withOutlet([UserRole.TenantAdmin, UserRole.AgencyAdmin], 0, <TenantInvitesTab />)],
};

/**
 * Träger admin (tenantId > 0): only "Berater-Invites". Tenant invites would create whole
 * tenants and external inbounds are platform-wide, so both tabs are not rendered at all.
 */
export const TenantAdmin: Story = {
    decorators: [withOutlet([UserRole.TenantAdmin, UserRole.UserAdmin], 7, <CounsellorInvitesTab />)],
};
