import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { UseAppConfigProvider } from '../../../../context/useAppConfig';
import i18n from '../../../../i18n';
import {
    getSessionAccessToken,
    getSessionRefreshToken,
    setSessionTokens,
} from '../../../../api/auth/tokenSessionStore';
import type { CaseHandoverReasonPolicy } from '../../../../types/caseHandoverReasonPolicy';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { CaseSharingMode } from './CaseSharingSection/caseSharingMode';
import { DEFAULT_PERMISSION_SETTINGS } from './permissionsSettingsUtils';

/**
 * ORISO-Admin#1558 — Storybook first. Case handover and team counselling become one choice on the
 * Mailberatung tile; the separate "Fallübergabe" tile goes. Live chat, group and internal group get
 * no such choice. The "Konto der ratsuchenden Person" tile stays: it holds two account-wide switches
 * that no conversation-type tile carries yet.
 *
 * Not wired to the real pages yet: the level of the choice and the migration are open product
 * decisions (see the issue).
 */

const policies: CaseHandoverReasonPolicy[] = [
    {
        code: 'ADVICE_REQUESTED',
        label: 'Advice requested',
        clientConsentRequired: true,
        clientConsent: { value: 'OPT_IN', mode: 'SUGGESTED' },
        accessAllowed: true,
        enabled: true,
        displayOrder: 10,
        policyAuthority: 'platform-admin-default-case-handover-policy',
        maxAccessDurationMinutes: 180,
        clientNotificationTemplates: {
            de: 'Du hast einem zeitlich begrenzten Einblick zugestimmt. {{newAdvisor}} kann diese Sitzung für {{duration}} mitlesen.',
            en: 'You agreed to a time-limited review. {{newAdvisor}} can read this session for {{duration}}.',
        },
    },
    {
        code: 'PLANNED_ABSENCE',
        label: 'Planned absence',
        clientConsentRequired: false,
        clientConsent: { value: 'NONE', mode: 'SUGGESTED' },
        accessAllowed: true,
        enabled: true,
        displayOrder: 20,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
    {
        code: 'UNPLANNED_ABSENCE',
        label: 'Unplanned absence',
        clientConsentRequired: false,
        clientConsent: { value: 'OPT_OUT', mode: 'SUGGESTED' },
        accessAllowed: true,
        enabled: true,
        displayOrder: 40,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
    {
        code: 'ASSIGNMENT_ENDED',
        label: 'Assignment ended',
        clientConsentRequired: false,
        clientConsent: { value: 'OPT_OUT', mode: 'ENFORCED' },
        accessAllowed: true,
        enabled: true,
        displayOrder: 50,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
];

type ViewProps = ComponentProps<typeof PermissionsSettingsView>;

/** Keeps the chosen option, so the story can be clicked through. */
const InteractiveView = (props: ViewProps) => {
    const [mode, setMode] = useState<CaseSharingMode | undefined>(props.caseSharing?.mode);
    return (
        <PermissionsSettingsView
            {...props}
            caseSharing={
                props.caseSharing && {
                    ...props.caseSharing,
                    mode,
                    onChange: (next) => {
                        setMode(next);
                        props.caseSharing?.onChange?.(next);
                    },
                }
            }
        />
    );
};

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/CaseSharing',
    component: PermissionsSettingsView,
    render: (args) => <InteractiveView {...args} />,
    parameters: {
        layout: 'fullscreen',
        msw: {
            handlers: [http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json(policies))],
        },
    },
    args: {
        tenantId: 'tenant-7',
        caseHandoverTenantId: 7,
        isLoading: false,
        formStateKey: 'story',
        restrictedFields: new Set<string>(),
        onToggleUpdate: fn(),
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS } },
        permissionPolicies: { caseHandoverEnabled: { value: true, mode: 'SUGGESTED' } },
    },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        const claims = {
            tenantId: 7,
            exp: Math.floor(Date.now() / 1000) + 3600,
            realm_access: { roles: ['tenant-admin'] },
        };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
        await i18n.changeLanguage('de');
        return () => {
            setSessionTokens(previousAccess, previousRefresh);
            i18n.changeLanguage(previousLanguage);
        };
    },
    decorators: [
        (Story) => (
            <UseAppConfigProvider>
                <Story />
            </UseAppConfigProvider>
        ),
    ],
} satisfies Meta<typeof PermissionsSettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

const CHOICE = /Fälle teilen|Sharing cases/;

/** Today (dev): the separate "Fallübergabe" tile above the conversation types. */
export const Before: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('case-handover-card')).toBeVisible();
        await expect(canvas.queryByRole('radiogroup', { name: CHOICE })).toBeNull();
    },
};

/** Target: one choice on the Mailberatung tile; "Fallübergabe" opens its settings inside it. */
export const AfterCaseHandover: Story = {
    args: { caseSharing: { mode: 'caseHandover' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByTestId('case-handover-card')).toBeNull();
        const mail = within(canvas.getByTestId('chat-type-card-oneOnOne'));
        await expect(mail.getByRole('radiogroup', { name: CHOICE })).toBeVisible();
        await expect(await mail.findByTestId('case-handover-settings')).toBeVisible();
        await expect(await mail.findByRole('tablist', { name: /Gründe|reasons/i })).toBeVisible();
        ['liveChat', 'group', 'groupInternal'].forEach((key) => {
            const tile = within(canvas.getByTestId(`chat-type-card-${key}`));
            expect(tile.queryByRole('radiogroup', { name: CHOICE })).toBeNull();
        });
    },
};

/** "Teamberatung" chosen: no handover settings. */
export const AfterTeamCounselling: Story = {
    args: { caseSharing: { mode: 'teamCounselling' } },
    play: async ({ canvasElement }) => {
        const mail = within(within(canvasElement).getByTestId('chat-type-card-oneOnOne'));
        await expect(mail.getByRole('radio', { name: /^Teamberatung|^Team counselling/ })).toBeChecked();
        await expect(mail.queryByTestId('case-handover-settings')).toBeNull();
    },
};

/** Switching from "Teamberatung" to "Fallübergabe" opens the handover settings. */
export const AfterSwitchToCaseHandover: Story = {
    args: { caseSharing: { mode: 'teamCounselling' } },
    play: async ({ canvasElement }) => {
        const mail = within(within(canvasElement).getByTestId('chat-type-card-oneOnOne'));
        await expect(mail.queryByTestId('case-handover-settings')).toBeNull();
        await userEvent.click(mail.getByRole('radio', { name: /^Fallübergabe|^Case handover/ }));
        await waitFor(() => expect(mail.getByTestId('case-handover-settings')).toBeVisible());
    },
};

/** A Beratungsstelle that has team counselling and case handover on today is told to pick one. */
export const AfterBothActiveToday: Story = {
    args: { caseSharing: { mode: 'teamCounselling', bothActive: true } },
    play: async ({ canvasElement }) => {
        const mail = within(within(canvasElement).getByTestId('chat-type-card-oneOnOne'));
        await expect(mail.getByRole('status')).toHaveTextContent(/beide aktiv|both active/);
    },
};

/** Every conversation-type tile folded: the page becomes an overview, each header says what is set. */
export const AfterFolded: Story = {
    args: { caseSharing: { mode: 'caseHandover' } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const headers = ['oneOnOne', 'liveChat', 'group', 'groupInternal'].map(
            (key) => within(canvas.getByTestId(`chat-type-card-${key}`)).getAllByRole('button', { expanded: true })[0],
        );
        await headers.reduce((previous, header) => previous.then(() => userEvent.click(header)), Promise.resolve());
        headers.forEach((header) => expect(header).toHaveAttribute('aria-expanded', 'false'));
        await expect(headers[0]).toHaveTextContent(/Fallübergabe|Case handover/);
    },
};
