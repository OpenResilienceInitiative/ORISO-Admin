import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocumentMasterDataCard } from './index';
import { DpiaMasterData } from '../../../types/dpiaMasterData';

const filled: DpiaMasterData = {
    operator: {
        legalName: 'Deutscher Caritasverband e. V.',
        shortName: 'DCV',
        address: 'Karlstraße 40\n79104 Freiburg im Breisgau',
        contactEmail: 'datenschutz@example.org',
        contactPhone: '+49 761 200-0',
        dpoName: 'Stabsstelle Datenschutz',
        department: 'Online-Beratung',
        responsiblePerson: 'Maria Musterfrau',
    },
    supervisoryAuthority: {
        legalFramework: 'KDG',
        name: 'Katholisches Datenschutzzentrum Frankfurt',
        address: 'Hausener Weg 66\n60489 Frankfurt am Main',
        email: 'kdsz@example.org',
    },
    document: {
        documentDate: '2026-06-01',
        nextReviewDate: '2027-06-01',
    },
    keyFigures: {
        tenants: { count: 12, asOfDate: '2026-06-01' },
        counsellingCentres: { count: 340, asOfDate: '2026-06-01' },
        activeCounsellors: { count: 1280, asOfDate: '2026-06-01' },
        registeredClients: { count: 45200, asOfDate: '2026-06-01' },
    },
};

const meta = {
    title: 'Organisms/GlobalSettings/DocumentMasterDataCard',
    component: DocumentMasterDataCard,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined },
} satisfies Meta<typeof DocumentMasterDataCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {
    args: { data: filled },
};

/** Nothing maintained yet — every group renders empty rather than collapsing. */
export const Empty: Story = {
    args: { data: {} },
};

export const Loading: Story = {
    args: { isLoading: true },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: { data: filled, disabled: true },
};

/** GDPR preset — switches the norms the rendered documents cite. */
export const GdprFramework: Story = {
    args: {
        data: {
            ...filled,
            supervisoryAuthority: {
                legalFramework: 'GDPR',
                name: 'Landesbeauftragte für den Datenschutz Baden-Württemberg',
                address: 'Lautenschlagerstraße 20\n70173 Stuttgart',
                email: 'poststelle@example.org',
            },
        },
    },
};
