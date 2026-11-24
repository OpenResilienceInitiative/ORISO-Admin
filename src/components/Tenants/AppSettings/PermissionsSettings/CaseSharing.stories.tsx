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
import type { PolicyValue } from '../../../../types/permissionPolicy';
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
    const [policy, setPolicy] = useState<PolicyValue<CaseSharingMode> | undefined>(props.caseSharing?.policy);
    return (
        <PermissionsSettingsView
            {...props}
            caseSharing={
                props.caseSharing && {
                    ...props.caseSharing,
                    policy,
                    onChange: (next) => {
                        setPolicy(next);
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
        // The internal group chats tile with its "who can be picked" section, as on the Träger page.
        recipientScope: { policy: { value: 'TENANT', mode: 'SUGGESTED' }, onSave: fn(async () => undefined) },
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

const CHOICE = /^(Fälle von Ratsuchenden teilen|Sharing cases of advice seekers)$/;

/**
 * The case sharing section starts folded (Frank, 2026-11-24), like the other sections of the
 * Mailberatung tile; the fold icon leads its heading. Opens it and returns the tile.
 */
const openCaseSharing = async (canvasElement: HTMLElement) => {
    const mail = within(within(canvasElement).getByTestId('chat-type-card-oneOnOne'));
    const toggle = mail.getByRole('button', { name: CHOICE });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    return mail;
};

/** Today (dev): the separate "Fallübergabe" tile above the conversation types. */
export const Before: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByTestId('case-handover-card')).toBeVisible();
        await expect(canvas.queryByRole('group', { name: CHOICE })).toBeNull();
    },
};

/** Target: one choice on the Mailberatung tile; "Fallübergabe" opens its settings inside it. */
export const AfterCaseHandover: Story = {
    args: { caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' } } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByTestId('case-handover-card')).toBeNull();
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('group', { name: CHOICE })).toBeVisible();
        await expect(await mail.findByTestId('case-handover-settings')).toBeVisible();
        await expect(await mail.findByRole('tablist', { name: /Gründe|reasons/i })).toBeVisible();
        ['liveChat', 'group', 'groupInternal'].forEach((key) => {
            const tile = within(canvas.getByTestId(`chat-type-card-${key}`));
            expect(tile.queryByRole('group', { name: CHOICE })).toBeNull();
        });
    },
};

/** "Teamberatung" chosen: no handover settings. */
export const AfterTeamCounselling: Story = {
    args: { caseSharing: { policy: { value: 'teamCounselling', mode: 'SUGGESTED' } } },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('button', { name: /^(Teamberatung|Team counselling): / })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await expect(mail.queryByTestId('case-handover-settings')).toBeNull();
    },
};

/** Switching from "Teamberatung" to "Fallübergabe" opens the handover settings. */
export const AfterSwitchToCaseHandover: Story = {
    args: { caseSharing: { policy: { value: 'teamCounselling', mode: 'SUGGESTED' } } },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.queryByTestId('case-handover-settings')).toBeNull();
        await userEvent.click(mail.getByRole('button', { name: /^(Fallübergabe|Case handover): / }));
        await waitFor(() => expect(mail.getByTestId('case-handover-settings')).toBeVisible());
    },
};

/** A Beratungsstelle that has team counselling and case handover on today moves to case handover (the safer choice) and is told so. */
export const AfterBothActiveToday: Story = {
    args: { caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' }, bothActive: true } },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('status')).toHaveTextContent(/beide aktiv|both active/);
        await expect(
            mail.getByRole('button', { name: /Fallübergabe|Case handover/, pressed: true }),
        ).toBeInTheDocument();
    },
};

/** Every conversation-type tile folded: the page becomes an overview, each header says what is set. */
export const AfterFolded: Story = {
    args: { caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' } } },
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

/**
 * Platform admin: the tile icon (with a small pencil) opens name and icon of the conversation type
 * (the dialog comes with #1551). The renamed name shows on the tile and in the intro.
 */
export const AfterRenameFromIcon: Story = {
    args: {
        policyLevel: 'platform',
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' } },
        typeNames: { oneOnOne: 'Fragebogenberatung' },
        onEditTypeAppearance: fn(),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(within(canvas.getByTestId('permissions-intro')).getByText('Fragebogenberatung')).toBeVisible();
        const mail = within(canvas.getByTestId('chat-type-card-oneOnOne'));
        await userEvent.click(
            mail.getByRole('button', { name: /Fragebogenberatung.*ändern|Fragebogenberatung.*Change/ }),
        );
        await expect(args.onEditTypeAppearance).toHaveBeenCalledWith('oneOnOne');
    },
};

/** Centre page: the Träger requires case handover, so team counselling and "none" are greyed out. */
export const AfterRequiredByTraeger: Story = {
    args: {
        policyLevel: 'agency',
        caseSharing: { policy: { value: 'caseHandover', mode: 'ENFORCED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('button', { name: /^(Teamberatung|Team counselling): / })).toBeDisabled();
        await expect(mail.getByRole('button', { name: /^(Keine|None): / })).toBeDisabled();
        await expect(mail.getByRole('button', { name: /^(Fallübergabe|Case handover): / })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    },
};

/*
 * One page, three levels (Frank, 2026-11-18): platform, Träger and Beratungsstelle see the same
 * tiles, sections and descriptions. Only what a level cannot set is missing or read-only: a centre
 * has no value of its own for guest accounts and "who can be picked", and its channel switches are
 * the Träger's.
 */

/** Platform: sets defaults and requirements for every Träger. */
export const LevelPlatform: Story = {
    args: {
        policyLevel: 'platform',
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' } },
    },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('group', { name: CHOICE })).toBeVisible();
        await expect(mail.getByRole('group', { name: /Gastkonten|guest accounts/i })).toBeVisible();
    },
};

/** Träger: the platform suggests case handover; the Träger may change it and require it for its centres. */
export const LevelTraeger: Story = {
    args: {
        policyLevel: 'tenant',
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        const choice = within(mail.getByRole('group', { name: CHOICE }));
        await expect(
            choice.getByRole('button', { name: /^(Fälle von Ratsuchenden teilen|Sharing cases of advice seekers): / }),
        ).toBeEnabled();
        await expect(mail.getByRole('group', { name: /Gastkonten|guest accounts/i })).toBeVisible();
    },
};

/** Beratungsstelle: chooses while the Träger only suggests; channel switches are the Träger's. */
export const LevelCentre: Story = {
    args: {
        policyLevel: 'agency',
        channelsSetOnTraeger: true,
        traegerChannelPolicies: {},
        traegerDirectInvitePolicies: {},
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        const mail = await openCaseSharing(canvasElement);
        await expect(mail.getByRole('button', { name: /^(Teamberatung|Team counselling): / })).toBeEnabled();
        await expect(mail.getByRole('group', { name: /Direkteinladung|direct invitations/i })).toBeVisible();
    },
};
