import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CardGrid } from '../../CardGrid';
import { Page } from '../../Page';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { TENANT_DATA_KEY } from '../../../hooks/useTenantData.hook';
import generalStyles from '../GeneralSettings/styles.module.scss';
import { OwnTenantInformation } from './index';

/**
 * What a Träger admin sees under Einstellungen → Stammdaten & Mehr (ORISO-Admin#1466): the Träger
 * information entered at creation, read-only. The platform admin's own page keeps its editable card.
 */
const meta = {
    title: 'Organisms/Pages/Tenants/OwnTenantInformation',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const tabs = [
    { to: '/admin/theme-settings/master-data', titleKey: 'Stammdaten & Mehr', iconName: 'master_data' },
    { to: '/admin/theme-settings/general', titleKey: 'Erscheinungsbild', iconName: 'appearance' },
];

const seeded = (tenant: Record<string, unknown>) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData([TENANT_DATA_KEY, 'no-tenant-claim'], tenant);
    return client;
};

const page = (tenant: Record<string, unknown>) => (
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

export const Filled: Story = {
    render: () =>
        page({
            id: 2,
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
        }),
};

/** The Dev tenant "Springfield QA Dev" has only a name: the card still shows, with empty fields. */
export const OnlyAName: Story = {
    render: () => page({ id: 2, name: 'Springfield QA Dev' }),
};
