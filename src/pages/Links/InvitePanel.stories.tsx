import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { InviteEmailTemplateDTO } from '../../api/accountInvites/accountInvites';
import type { IdUnitOption } from '../../components/IdAllocationField';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import { InviteComposer, sendModeStorageKey, type InviteComposerProps } from './InviteComposer';
import {
    searchAgencies,
    searchTenants,
    stubbedAgencyIdAllocation,
    stubbedTenantIdAllocation,
    TENANTS,
} from './inviteStoryFixtures';

const TEMPLATES: InviteEmailTemplateDTO[] = [
    {
        id: 11,
        kind: 'COUNSELLOR_INVITE',
        name: 'Standard Berater:in',
        language: 'de',
        subject: 'Ihr Zugang zur Beratungsplattform',
        body: 'Hallo {{firstName}},\n\nüber diesen Link richten Sie Ihren Zugang ein: {{inviteLink}}',
        active: true,
        createDate: '2026-07-01T10:00:00Z',
        updateDate: null,
    },
    {
        id: 12,
        kind: 'TENANT_INVITE',
        name: 'Standard Träger-Admin',
        language: 'de',
        subject: 'Ihr Zugang als Träger-Admin',
        body: 'Hallo {{firstName}},\n\nhier entlang: {{inviteLink}}',
        active: true,
        createDate: '2026-07-01T10:00:00Z',
        updateDate: null,
    },
];

const PREFILLED = {
    recipientEmail: 'nancy.wheeler@beispiel.de',
    firstName: 'Nancy',
    lastName: 'Wheeler',
    tenant: TENANTS[0],
    agency: { id: 101, name: 'Caritas Suchtberatung Freiburg', topics: ['Sucht', 'Glücksspiel'] } as IdUnitOption,
};

interface PanelArgs extends Partial<InviteComposerProps> {
    startCollapsed?: boolean;
    width?: number;
}

/** The card the way AccountInvitesTab renders it: left of the table, 360px, foldable. */
const Panel = ({ startCollapsed = false, width = 408, tab = 'counsellor', templates, ...props }: PanelArgs) => {
    const [collapsed, setCollapsed] = useState(startCollapsed);
    const [templateId, setTemplateId] = useState<number | undefined>(templates?.selectedId);
    const list = TEMPLATES.filter((template) =>
        tab === 'tenant' ? template.kind === 'TENANT_INVITE' : template.kind === 'COUNSELLOR_INVITE',
    );
    return (
        // 360px card plus the 24px page gutter on both sides.
        <div
            style={{
                display: 'flex',
                width,
                padding: 24,
                boxSizing: 'border-box',
                background: 'var(--m3-background, #eae7e8)',
            }}
        >
            <InviteComposer
                layout="panel"
                tab={tab}
                persistKey={`INVITE_PANEL_${tab}`}
                viewer={{ scope: 'platform' }}
                clients={{
                    agencyIdAllocation: stubbedAgencyIdAllocation,
                    tenantIdAllocation: stubbedTenantIdAllocation,
                    searchAgencies,
                    searchTenants,
                }}
                templates={{
                    list,
                    selectedId: templateId,
                    onSelect: setTemplateId,
                    onManage: () => {},
                }}
                panelCollapsed={collapsed}
                onPanelCollapsedChange={setCollapsed}
                onSubmit={() => true}
                {...props}
            />
        </div>
    );
};

const meta = {
    title: 'Organisms/Pages/Links/InvitePanel',
    component: Panel,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [http.get('*/service/useradmin/invite-email-templates', () => HttpResponse.json(TEMPLATES))] },
    },
    decorators: [
        withAdminProviders,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            window.localStorage.removeItem(sendModeStorageKey('INVITE_PANEL_counsellor'));
            window.localStorage.removeItem(sendModeStorageKey('INVITE_PANEL_tenant'));
            return <Story />;
        },
    ],
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

const either = (de: string, en: string) => new RegExp(`(${de}|${en})`);
const SUMMARY = 'invite-panel-summary';

/** A fresh card: every field open, the header lists what is still missing. */
export const Empty: Story = {
    play: async ({ canvas }) => {
        await expect(
            await canvas.findByRole('heading', { name: either('Berater:in einladen', 'Invite counsellor') }),
        ).toBeVisible();
        await expect(canvas.getByTestId(SUMMARY)).toHaveTextContent(either('Noch offen', 'Still missing'));
        await expect(canvas.getByRole('textbox', { name: /^(E-Mail|E-mail)$/ })).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: either('E-Mail-Vorlage wählen', 'Choose e-mail template') }),
        ).toBeVisible();
    },
};

/** E-Mail, Vorname and Name fold into ONE pill once all three are valid; a click opens the group again. */
export const PersonFoldsIntoOnePill: Story = {
    play: async ({ canvas }) => {
        await userEvent.type(
            await canvas.findByRole('textbox', { name: /^(E-Mail|E-mail)$/ }),
            PREFILLED.recipientEmail,
        );
        await userEvent.tab();
        await userEvent.type(canvas.getByRole('textbox', { name: /^(Vorname|First name)$/ }), PREFILLED.firstName);
        await userEvent.tab();
        await userEvent.type(canvas.getByRole('textbox', { name: /^Name$/ }), PREFILLED.lastName);
        await userEvent.tab();

        const person = await canvas.findByRole('button', { name: /Nancy Wheeler · nancy\.wheeler@beispiel\.de/ });
        await expect(canvas.queryByRole('textbox', { name: /^(E-Mail|E-mail)$/ })).not.toBeInTheDocument();

        await userEvent.click(person);
        const email = await canvas.findByRole('textbox', { name: /^(E-Mail|E-mail)$/ });
        await waitFor(() => expect(email).toHaveFocus());
    },
};

/** Everything chosen: tonal rows with their own icons, the header says „Alles bereit", send is live. */
export const AllValid: Story = {
    args: { initialValues: PREFILLED, templates: { list: [], selectedId: 11, onManage: () => {} } },
    play: async ({ canvas }) => {
        await waitFor(() => expect(canvas.getByTestId(SUMMARY)).toHaveTextContent(either('Alles bereit', 'All set')));
        await expect(canvas.getByRole('button', { name: either('Einladen', 'Invite') })).toBeEnabled();
    },
};

/** A malformed address: the field stays open, the error sits under it and the first segment turns magenta. */
export const ErrorState: Story = {
    play: async ({ canvas }) => {
        const email = await canvas.findByRole('textbox', { name: /^(E-Mail|E-mail)$/ });
        await userEvent.type(email, 'nancy@');
        await userEvent.tab();
        await expect(email).toHaveAttribute('aria-invalid', 'true');
        await expect(
            canvas.getByText(either('Bitte gültige E-Mail-Adresse eingeben.', 'Please enter a valid')),
        ).toBeVisible();
    },
};

/** Träger tab: role fixed on Träger-Admin, no Beratungsstelle, the number stepper stays visible. */
export const TraegerTab: Story = {
    args: { tab: 'tenant' },
    play: async ({ canvas }) => {
        await expect(
            await canvas.findByRole('heading', { name: either('Träger-Admin einladen', 'Invite tenant admin') }),
        ).toBeVisible();
        await expect(canvas.getByRole('button', { name: either('Rolle bearbeiten', 'Edit Role') })).toBeDisabled();
        await expect(canvas.queryByRole('combobox', { name: /^(Beratungsstelle|Agency)$/ })).not.toBeInTheDocument();
    },
};

/** Folding: the card becomes an 80px rail; a field button opens the card on that field. */
export const FoldToRail: Story = {
    play: async ({ canvas }) => {
        await userEvent.click(
            await canvas.findByRole('button', { name: either('Formular einklappen', 'Collapse form') }),
        );
        const rail = await canvas.findByRole('region', { name: either('Berater:in einladen', 'Invite counsellor') });
        await expect(rail).toHaveAttribute('data-collapsed');
        await userEvent.click(within(rail).getByRole('button', { name: either('E-Mail & Name', 'E-mail & name') }));
        await waitFor(() => expect(canvas.getByRole('textbox', { name: /^(E-Mail|E-mail)$/ })).toHaveFocus());
    },
};

/** The rail on its own (panel folded, nothing filled yet). */
export const Rail: Story = {
    args: { startCollapsed: true, width: 128 },
};

/** Rail with everything ready: tonal field buttons and a red send button that sends right away. */
export const RailReady: Story = {
    args: {
        startCollapsed: true,
        width: 128,
        initialValues: PREFILLED,
        templates: { list: [], selectedId: 11, onManage: () => {} },
        onSubmit: fn(() => true),
    },
    play: async ({ args, canvas }) => {
        const send = await canvas.findByRole('button', { name: either('Einladen', 'Invite') });
        await waitFor(() => expect(send).toHaveAttribute('title', expect.stringMatching(either('Einladen', 'Invite'))));
        await userEvent.click(send);
        await waitFor(() => expect(args.onSubmit).toHaveBeenCalled());
    },
};
