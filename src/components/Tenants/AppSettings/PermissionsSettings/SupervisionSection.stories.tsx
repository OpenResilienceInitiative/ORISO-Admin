import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { UseAppConfigProvider } from '../../../../context/useAppConfig';
import i18n from '../../../../i18n';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { DEFAULT_PERMISSION_SETTINGS } from './permissionsSettingsUtils';
import { SUPERVISION_MASTER } from './traegerFunctions';

/**
 * Supervision is a folding section of the Mail-Beratung tile on every level (Frank, 2026-11-25; decision
 * update on ORISO-Admin#1577), built like the case-sharing section next to it: the master switch and
 * "Konfigurieren" for what the supervision chat offers. There is no separate Supervision tile; Live Chat
 * keeps only its own per-type "Supervision" switch; Team-Chat stays its own tile.
 */
const on = (mode: PolicyValue<boolean>['mode'] = 'SUGGESTED', inherited = false) => ({
    value: true,
    mode,
    inherited,
});

const meta = {
    title: 'Settings/Einstellungen/Funktionszugriff/SupervisionSection',
    id: 'settings-einstellungen-funktionszugriff-supervisionsection',
    component: PermissionsSettingsView,
    parameters: {
        layout: 'fullscreen',
        msw: { handlers: [http.get('*/service/users/case-handover/reason-policies', () => HttpResponse.json([]))] },
    },
    args: {
        tenantId: 'tenant-7',
        caseHandoverTenantId: 7,
        isLoading: false,
        formStateKey: 'story',
        restrictedFields: new Set<string>(),
        onToggleUpdate: fn(),
        onPolicyChange: fn(),
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS, [SUPERVISION_MASTER]: true } },
        permissionPolicies: { [SUPERVISION_MASTER]: on() },
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED' } },
    },
    beforeEach: async () => {
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
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

const SECTION = /^Supervision$/;
const mailTile = (canvasElement: HTMLElement) => within(canvasElement).getByTestId('chat-type-card-oneOnOne');

/** The section starts folded, like case sharing; opens it and returns what is inside. */
const openSupervision = async (canvasElement: HTMLElement) => {
    const toggle = within(mailTile(canvasElement)).getByRole('button', { name: SECTION });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    return within(within(canvasElement).getByTestId('supervision-section'));
};

/** Inside the Mail-Beratung tile, after case sharing; no tile of its own; Team-Chat keeps its tile. */
const expectInMailTile = async (canvasElement: HTMLElement) => {
    const page = within(canvasElement);
    await expect(page.queryByTestId('supervision-tile')).not.toBeInTheDocument();
    await expect(page.getByTestId('team-chat-tile')).toBeInTheDocument();
    const mail = mailTile(canvasElement);
    const supervision = within(mail).getByRole('group', { name: SECTION });
    const caseSharing = within(mail).getByRole('group', { name: /Fälle von Ratsuchenden teilen/ });
    // eslint-disable-next-line no-bitwise -- DOM position flags
    await expect(caseSharing.compareDocumentPosition(supervision) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The folded tile still says whether supervision is on, next to the case sharing.
    await expect(within(mail).getByText(/Fallübergabe · Supervision an/)).toBeInTheDocument();
    // The page intro names case handover and supervision under Mail Beratung.
    await expect(within(page.getByTestId('permissions-intro')).getByText(/Fallübergabe.*Supervision/)).toBeVisible();
};

/** Platform: sets supervision for every Träger; may make it a requirement. */
export const LevelPlatform: Story = {
    args: { policyLevel: 'platform' },
    play: async ({ canvasElement }) => {
        await expectInMailTile(canvasElement);
        const section = await openSupervision(canvasElement);
        await expect(section.getByRole('button', { name: /^Aktiviert: Aktiviert – Deaktivieren$/ })).toBeEnabled();
        await expect(section.getByRole('button', { name: /^Aktiviert: Anpassbar – / })).toBeEnabled();
        await expect(section.getByRole('button', { name: 'Konfigurieren' })).toBeEnabled();
    },
};

/** Träger: the platform suggests it; the Träger may change it and require it for its centres. */
export const LevelTraeger: Story = {
    args: { policyLevel: 'tenant', permissionPolicies: { [SUPERVISION_MASTER]: on('SUGGESTED', true) } },
    play: async ({ canvasElement, args }) => {
        await expectInMailTile(canvasElement);
        const section = await openSupervision(canvasElement);
        await userEvent.click(section.getByRole('button', { name: 'Konfigurieren' }));
        const dialog = within(await within(canvasElement.ownerDocument.body).findByTestId('supervision-dialog'));
        // The dialog fades in.
        await waitFor(() => expect(dialog.getByText('Was der Supervisions-Chat bietet')).toBeVisible());
        await userEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        await expect(args.onPolicyChange).not.toHaveBeenCalled();
    },
};

/** Beratungsstelle: switches supervision for itself; no requirement lock (no level below). */
export const LevelCentre: Story = {
    args: {
        policyLevel: 'agency',
        channelsSetOnTraeger: true,
        traegerChannelPolicies: {},
        traegerDirectInvitePolicies: {},
        permissionPolicies: { [SUPERVISION_MASTER]: on('SUGGESTED', true) },
        caseSharing: { policy: { value: 'caseHandover', mode: 'SUGGESTED', inherited: true } },
    },
    play: async ({ canvasElement }) => {
        await expectInMailTile(canvasElement);
        const section = await openSupervision(canvasElement);
        await expect(section.getByRole('button', { name: /^Aktiviert: Aktiviert – Deaktivieren$/ })).toBeEnabled();
        await expect(section.queryByRole('button', { name: /^Aktiviert: Anpassbar – / })).not.toBeInTheDocument();
    },
};

/** Beratungsstelle under a Träger requirement: the switch is locked. */
export const CentreRequiredByTraeger: Story = {
    args: {
        ...LevelCentre.args,
        permissionPolicies: { [SUPERVISION_MASTER]: on('ENFORCED', true) },
    },
    play: async ({ canvasElement }) => {
        const section = await openSupervision(canvasElement);
        await expect(section.getByRole('button', { name: /^Aktiviert: Aktiviert/ })).toBeDisabled();
    },
};

/** Off: "Konfigurieren" waits; switching on asks about the privacy policy first, then saves. */
export const OffThenSwitchOn: Story = {
    args: {
        policyLevel: 'tenant',
        initialValues: { settings: { ...DEFAULT_PERMISSION_SETTINGS, [SUPERVISION_MASTER]: false } },
        permissionPolicies: { [SUPERVISION_MASTER]: { value: false, mode: 'SUGGESTED' } },
    },
    play: async ({ canvasElement, args }) => {
        await expect(within(mailTile(canvasElement)).getByText(/Supervision aus/)).toBeInTheDocument();
        const section = await openSupervision(canvasElement);
        await expect(section.getByRole('button', { name: 'Konfigurieren' })).toBeDisabled();
        await expect(section.getByText('Verfügbar, sobald Supervision aktiviert ist.')).toBeVisible();
        await userEvent.click(section.getByRole('button', { name: /^Aktiviert: Deaktiviert – Aktivieren$/ }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: 'Ist geregelt, einschalten' }));
        await waitFor(() =>
            expect(args.onPolicyChange).toHaveBeenCalledWith(
                SUPERVISION_MASTER,
                expect.objectContaining({ value: true }),
            ),
        );
    },
};

/** English. */
export const English: Story = {
    args: { policyLevel: 'tenant' },
    beforeEach: async () => {
        await i18n.changeLanguage('en');
    },
    play: async ({ canvasElement }) => {
        const toggle = within(mailTile(canvasElement)).getByRole('button', { name: SECTION });
        await userEvent.click(toggle);
        const section = within(within(canvasElement).getByTestId('supervision-section'));
        await expect(section.getByRole('button', { name: 'Configure' })).toBeEnabled();
    },
};
