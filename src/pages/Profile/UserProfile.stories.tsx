import { http, HttpResponse } from 'msw';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { AdminDisplayBoundary, LanguageAwareConfigProvider } from '../../AdminApp';
import { profileUserDataHandlers } from '../../test/profileUserData';
import { withRoles } from './profileStory.matrix';
import { UserProfile } from './UserProfile';

/**
 * "Mein Account" as the Beratungsstellen-Admin sees it: all tiles in the settings raster.
 * Check it at Laptop 1280 and Phone 390: tiles share the rows, nothing scrolls sideways.
 */
const meta = {
    title: 'Settings/Mein Account/UserProfile',
    id: 'pages-profile-userprofile',
    component: UserProfile,
    parameters: { layout: 'fullscreen', msw: { handlers: profileUserDataHandlers } },
    decorators: [withRoles(['agency-admin', 'user-admin'])],
} satisfies Meta<typeof UserProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BeratungsstellenAdmin: Story = {
    play: async ({ canvas }) => {
        await waitFor(() => expect(canvas.getByTestId('profile-roles-card')).toBeInTheDocument());
        await expect(canvas.getByTestId('profile-absence-card')).toBeInTheDocument();
        await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    },
};

/** A Träger-Admin has no personal data tile on this page. */
export const TraegerAdmin: Story = {
    decorators: [withRoles(['tenant-admin'])],
    play: async ({ canvas }) => {
        await waitFor(() => expect(canvas.getByTestId('profile-roles-card')).toBeInTheDocument());
    },
};

const ProfileDisplayExperiment = () => (
    <LanguageAwareConfigProvider>
        <AdminDisplayBoundary theming={{ primaryColor: '#b4ddee', accent: '#f2d16b' }}>
            <UserProfile />
        </AdminDisplayBoundary>
    </LanguageAwareConfigProvider>
);

const displayHandlers = [
    ...profileUserDataHandlers,
    http.get('*/service/agencyadmin/agencies', () =>
        HttpResponse.json({
            total: 1,
            _embedded: [
                {
                    id: 1,
                    name: 'Beratungsstelle Beispiel',
                    postcode: '10115',
                    city: 'Berlin',
                    tenantId: 1,
                    deleteDate: null,
                    topics: [{ id: 1, name: 'Familienberatung', status: 'ACTIVE' }],
                },
            ],
        }),
    ),
];

export const PersonalDisplayAgency: Story = {
    parameters: { msw: { handlers: displayHandlers } },
    render: () => <ProfileDisplayExperiment />,
};

export const PersonalDisplayTenant: Story = {
    parameters: { msw: { handlers: displayHandlers } },
    decorators: [withRoles(['tenant-admin'])],
    render: () => <ProfileDisplayExperiment />,
};
