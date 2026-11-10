import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CardGrid } from '../../CardGrid';
import { Page } from '../../Page';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import generalStyles from '../GeneralSettings/styles.module.scss';
import { OwnTenantInformation } from './index';

/**
 * What a Träger admin sees under Einstellungen → Stammdaten & Mehr (ORISO-Admin#1466): the Träger
 * information entered at creation. A Träger admin may change it (product decision 2026-11-09); the
 * platform admin's own page keeps its editable card.
 */
const meta = {
    title: 'Organisms/Pages/Tenants/OwnTenantInformation',
    parameters: { layout: 'fullscreen' },
    decorators: [withAdminProviders],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The Träger the story signs in to; the seeded tenant cache key must use the same id. */
const STORY_TENANT_ID = 2;

const tabs = [
    { to: '/admin/theme-settings/master-data', titleKey: 'Stammdaten & Mehr', iconName: 'master_data' },
    { to: '/admin/theme-settings/general', titleKey: 'Erscheinungsbild', iconName: 'appearance' },
];

const seeded = (tenant: Record<string, unknown>) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData([TENANT_DATA_KEY, STORY_TENANT_ID], tenant);
    return client;
};

const pageContent = (tenant: Record<string, unknown>) => (
    <QueryClientProvider client={seeded(tenant)}>
        <ThemeProvider theme={orisoMuiTheme}>
            <Page>
                <Page.Title
                    titleKey="Einstellungen"
                    subTitleKey="Stammdaten und Erscheinungsbild Ihres Trägers"
                    tabs={tabs}
                />
                <div className={generalStyles.appearancePage}>
                    <CardGrid raster>
                        <CardGrid.Item>
                            <OwnTenantInformation />
                        </CardGrid.Item>
                    </CardGrid>
                </div>
            </Page>
        </ThemeProvider>
    </QueryClientProvider>
);

const page = (tenant: Record<string, unknown>) => {
    // The edit pencil needs the Träger admin's update permission, read from the token.
    setStoryAuth([UserRole.TenantAdmin], STORY_TENANT_ID);
    return pageContent(tenant);
};

const filledTenant = {
    id: STORY_TENANT_ID,
    name: 'Caritas Springfield',
    address: 'Evergreen Terrace 742, 12345 Springfield',
    legalName: 'Caritas Springfield e. V.',
    contactEmail: 'kontakt@springfield.example',
    contactPhone: '+49 30 123456',
    description: 'Beratung für die ganze Familie: Schulden, Sucht, Erziehung und Migration.',
    dataProtectionOfficer: {
        nameAndLegalForm: 'Datenschutz Springfield GmbH',
        street: 'Main Street 1',
        postcode: '12345',
        city: 'Springfield',
        phoneNumber: '+49 30 654321',
        email: 'datenschutz@springfield.example',
    },
};

export const Filled: Story = { render: () => page(filledTenant) };

/** The pencil was pressed: every field of the card is open for the Träger admin. */
export const Editing: Story = {
    render: () => page(filledTenant),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: /bearbeiten|edit/i }));
        await waitFor(() => expect(canvas.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield')).toBeEnabled());
        // The name has its own tile and stays closed here.
        await expect(canvas.getByDisplayValue('Caritas Springfield')).toBeDisabled();
    },
};

/** The Dev tenant "Springfield QA Dev" has only a name: the card still shows, with empty fields. */
export const OnlyAName: Story = {
    render: () => page({ id: STORY_TENANT_ID, name: 'Springfield QA Dev' }),
};
