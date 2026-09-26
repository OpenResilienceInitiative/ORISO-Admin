import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath resolves in Storybook/Vite
import { expect, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../../../enums/UserRole';
import { useAppConfigContext } from '../../../../../context/useAppConfig';
import { setStoryAuth, withAdminProviders } from '../../../../../utils/storybook/adminStoryDecorators';
import { AgencyLegalTextContainer } from '.';

/**
 * #1066: what the agency legal card says about its text — whose it is, why it cannot be
 * changed, and which Fachbereich it opens on.
 */
const AGENCY_ID = 55;
const TENANT_ID = 7;
const USER_ID = 'storybook-agency-admin';

const TWO_TOPICS = [
    { id: 3, name: 'Schwangerschaftsberatung' },
    { id: 4, name: 'Schuldnerberatung' },
];

const agencyWithoutOwnText = {
    id: AGENCY_ID,
    tenantId: TENANT_ID,
    name: 'Beratungsstelle Nordlicht',
    topics: TWO_TOPICS,
    content: { privacy: {} },
} as any;

const tenant = {
    id: TENANT_ID,
    name: 'Träger Nordlicht',
    settings: { activeLanguages: ['de'] },
    content: {
        privacy: {
            de:
                '<h2>Datenschutzerklärung des Trägers</h2><p>Diese Fassung gilt für alle Beratungsstellen, ' +
                'die keine eigene veröffentlicht haben.</p>',
        },
    },
};

const handlers = [
    http.get('*/service/users/data', () => HttpResponse.json({ id: USER_ID })),
    http.get('*/service/tenant/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/tenantadmin/:id', () => HttpResponse.json(tenant)),
    http.get('*/service/agencyadmin/agencies/:id/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/agencyadmin/agencies/:id/topics/:topicId/legal-versions', () => HttpResponse.json([])),
    http.get('*/service/agencyadmin/agencies/:id/legal-drafts/DPP', () => new HttpResponse(null, { status: 404 })),
    // A Fachbereich that never published keeps inheriting: no content, status DRAFT.
    http.get('*/service/agencyadmin/agencies/:id/topics/:topicId/dpp', () =>
        HttpResponse.json({ content: null, publicationStatus: 'DRAFT' }),
    ),
];

/** The platform-wide switch "Einstellungen Rechtstexte" turned off, as on staging 25.09.2026. */
const LockedPlatform = ({ children }: { children: ReactNode }): ReactNode => {
    const { setManualSettings } = useAppConfigContext();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setManualSettings({
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        });
        setReady(true);
    }, [setManualSettings]);
    return ready ? children : null;
};

/** Every control of the lower function bar lies inside it; none is pushed past its right edge. */
const expectFunctionBarFits = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByTestId('m3-editor-function-bar', {}, { timeout: 8000 });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Versionsverlauf' })).toBeVisible());
    const barRight = bar.getBoundingClientRect().right;
    Array.from(bar.children).forEach((child) =>
        expect(child.getBoundingClientRect().right).toBeLessThanOrEqual(barRight + 0.5),
    );
};

const meta = {
    title: 'Organisms/Legal/AgencyLegalText/Card state',
    component: AgencyLegalTextContainer,
    parameters: { layout: 'padded', msw: { handlers } },
    decorators: [
        (Story) =>
            withAdminProviders(() => (
                <div style={{ minHeight: 760, padding: 16 }}>
                    <Story />
                </div>
            )),
    ],
    args: {
        agencyData: agencyWithoutOwnText,
        field: 'privacy',
        onSaveAgencyWide: async () => undefined,
    },
} satisfies Meta<typeof AgencyLegalTextContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No own text: the Träger text is shown and marked as taken over, never as "Veröffentlicht". */
export const InheritedFromTraeger: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Vom Träger übernommen', {}, { timeout: 8000 })).toBeVisible();
        await expect(canvas.queryByText('Veröffentlicht', { selector: '.ant-tag' })).not.toBeInTheDocument();
    },
};

/** Same agency, opened by the platform admin: same text, same badge — only editable. */
export const PlatformAdminSeesTheSameCard: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin], 0),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Vom Träger übernommen', {}, { timeout: 8000 })).toBeVisible();
        await expect(canvas.getByRole('heading', { name: 'Datenschutzerklärung des Trägers' })).toBeVisible();
    },
};

/** Beratungsstelle admin under the platform-wide lock: the note names the lock and who lifts it. */
export const PlatformLockReadOnly: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    decorators: [
        (Story) => (
            <LockedPlatform>
                <Story />
            </LockedPlatform>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            await canvas.findByText(/Änderungen an Rechtstexten sind plattformweit gesperrt/, {}, { timeout: 8000 }),
        ).toBeVisible();
        await expect(canvas.queryByText(/Diesen Text pflegt Ihr Träger/)).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Veröffentlichen' })).not.toBeInTheDocument();
    },
};

/** Exactly one Fachbereich (the Caritas case): it is preselected, "Alle Fachbereiche" is not offered. */
export const SingleFachbereichPreselected: Story = {
    beforeEach: () => setStoryAuth([UserRole.AgencyAdmin], TENANT_ID),
    args: { agencyData: { ...agencyWithoutOwnText, topics: [TWO_TOPICS[0]] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Schwangerschaftsberatung', {}, { timeout: 8000 })).toBeVisible();
        await expect(canvas.queryByText('Alle Fachbereiche')).not.toBeInTheDocument();
        await expect(await canvas.findByText('Vom Träger übernommen', {}, { timeout: 8000 })).toBeVisible();
        await expectFunctionBarFits(canvasElement);
    },
};

/** Same card at 390px (mobile): the function bar wraps, every control stays inside the card. */
export const SingleFachbereichMobile: Story = {
    ...SingleFachbereichPreselected,
    // 16px gutter + 358px card + 16px gutter = a 390px phone.
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div style={{ width: 358 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        await expectFunctionBarFits(canvasElement);
    },
};
